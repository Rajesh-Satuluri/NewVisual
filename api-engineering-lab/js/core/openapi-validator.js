/* ============================================================
   openapi-validator.js — structural OpenAPI 3.x validation
   ------------------------------------------------------------
   Parses YAML with the vendored js-yaml, then runs structural
   checks over the document: required top-level fields, path and
   operation shape, response codes, path-template parameters,
   local $ref resolution, duplicate operationIds, and security
   scheme references. Not a full JSON-Schema validator — but a
   real parser-based one, so edits to the spec actually matter.

   AV.OpenAPI.parse(src)    → { spec } | { error, line }
   AV.OpenAPI.validate(src) → { errors:[{msg,where}], warnings:[…],
                                spec|null, parseError|null }
   AV.OpenAPI.docModel(spec)→ [{ method, path, summary, auth,
                                params:[…], body, responses:[…] }]
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});
  var METHODS = ["get", "post", "put", "patch", "delete", "head", "options", "trace"];

  function yaml() { return window.jsyaml; }

  function parse(src) {
    if (!yaml()) return { error: "YAML parser not loaded", line: null };
    try {
      var spec = yaml().load(src);
      if (!spec || typeof spec !== "object") return { error: "The document is empty or not a mapping", line: null };
      return { spec: spec };
    } catch (e) {
      return { error: e.reason || e.message || String(e), line: e.mark ? e.mark.line + 1 : null };
    }
  }

  // Resolve a local $ref like '#/components/schemas/Order'.
  function deref(spec, ref) {
    if (typeof ref !== "string" || ref.charAt(0) !== "#") return undefined;
    var parts = ref.slice(2).split("/");
    var node = spec;
    for (var i = 0; i < parts.length; i++) {
      var key = parts[i].replace(/~1/g, "/").replace(/~0/g, "~");
      if (!node || typeof node !== "object" || !(key in node)) return undefined;
      node = node[key];
    }
    return node;
  }

  function walkRefs(node, path, out) {
    if (!node || typeof node !== "object") return;
    if (typeof node.$ref === "string") out.push({ ref: node.$ref, where: path });
    for (var k in node) if (node.hasOwnProperty(k) && k !== "$ref") walkRefs(node[k], path + "/" + k, out);
  }

  function validate(src) {
    var errors = [], warnings = [];
    var p = parse(src);
    if (p.error) {
      return { errors: [{ msg: "YAML parse error: " + p.error + (p.line ? " (line " + p.line + ")" : ""), where: "document" }], warnings: [], spec: null, parseError: p.error };
    }
    var spec = p.spec;
    function err(msg, where) { errors.push({ msg: msg, where: where || "" }); }
    function warn(msg, where) { warnings.push({ msg: msg, where: where || "" }); }

    // ── top level ──
    if (!spec.openapi) err("missing `openapi` version field", "root");
    else if (!/^3\./.test(String(spec.openapi))) err("`openapi: " + spec.openapi + "` — this studio validates OpenAPI 3.x", "root");
    if (!spec.info) err("missing `info` object", "root");
    else {
      if (!spec.info.title) err("missing `info.title`", "info");
      if (!spec.info.version) err("missing `info.version` (the API's version, e.g. 1.0.0)", "info");
    }
    if (!spec.paths || typeof spec.paths !== "object" || Object.keys(spec.paths).length === 0) {
      err("`paths` is missing or empty — an API with no operations isn't much of an API", "root");
    }

    var schemes = (spec.components && spec.components.securitySchemes) || {};
    var opIds = {};

    var paths = spec.paths || {};
    Object.keys(paths).forEach(function (pth) {
      var where = "paths." + pth;
      if (pth.charAt(0) !== "/") err("path `" + pth + "` must start with `/`", where);
      var item = paths[pth];
      if (!item || typeof item !== "object") { err("path item is not an object", where); return; }

      var templated = [];
      var m2;
      var reTpl = /\{([^}]+)\}/g;
      while ((m2 = reTpl.exec(pth))) templated.push(m2[1]);

      var ops = Object.keys(item).filter(function (k) { return METHODS.indexOf(k) !== -1; });
      if (ops.length === 0) warn("no operations (get/post/…) under this path", where);
      Object.keys(item).forEach(function (k) {
        if (METHODS.indexOf(k) === -1 && ["parameters", "summary", "description", "servers", "$ref"].indexOf(k) === -1)
          err("`" + k + "` is not an HTTP method or allowed path-item field", where);
      });

      ops.forEach(function (m) {
        var op = item[m];
        var ow = m.toUpperCase() + " " + pth;
        if (!op || typeof op !== "object") { err("operation is not an object", ow); return; }

        if (op.operationId) {
          if (opIds[op.operationId]) err("duplicate operationId `" + op.operationId + "` (also on " + opIds[op.operationId] + ")", ow);
          else opIds[op.operationId] = ow;
        } else warn("no operationId — SDK generators need one", ow);

        // responses
        if (!op.responses || typeof op.responses !== "object" || Object.keys(op.responses).length === 0) {
          err("no `responses` — every operation must declare at least one", ow);
        } else {
          Object.keys(op.responses).forEach(function (code) {
            if (code !== "default" && !/^[1-5](\d\d|XX)$/.test(code)) err("`" + code + "` is not a valid response code (use 200-style codes, 2XX ranges, or default)", ow);
          });
          var has2xx = Object.keys(op.responses).some(function (c) { return /^2/.test(c) || c === "default"; });
          if (!has2xx) warn("no 2xx/default response declared — can this operation ever succeed?", ow);
        }

        // parameters: merge path-level + op-level
        var params = [].concat(item.parameters || [], op.parameters || []);
        var declared = {};
        params.forEach(function (prm) {
          if (prm && prm.$ref) { var d = deref(spec, prm.$ref); if (d) prm = d; }
          if (!prm || typeof prm !== "object") return;
          if (!prm.name || !prm.in) { err("a parameter is missing `name` or `in`", ow); return; }
          if (["path", "query", "header", "cookie"].indexOf(prm.in) === -1) err("parameter `" + prm.name + "`: `in: " + prm.in + "` is not valid (path/query/header/cookie)", ow);
          if (prm.in === "path") {
            declared[prm.name] = true;
            if (prm.required !== true) err("path parameter `" + prm.name + "` must be `required: true`", ow);
            if (templated.indexOf(prm.name) === -1) err("path parameter `" + prm.name + "` doesn't appear in the path template", ow);
          }
          if (!prm.schema && !prm.content) warn("parameter `" + prm.name + "` has no schema", ow);
        });
        templated.forEach(function (t) {
          if (!declared[t]) err("path template `{" + t + "}` has no matching `in: path` parameter", ow);
        });

        // requestBody
        if (op.requestBody && !op.requestBody.$ref) {
          if (!op.requestBody.content || Object.keys(op.requestBody.content).length === 0) err("requestBody has no `content` media types", ow);
        }
        if ((m === "get" || m === "delete") && op.requestBody) warn("a request body on " + m.toUpperCase() + " is legal but widely unsupported — reconsider", ow);

        // security references
        (op.security || []).forEach(function (sec) {
          Object.keys(sec || {}).forEach(function (name) {
            if (!schemes[name]) err("security scheme `" + name + "` is not defined in components.securitySchemes", ow);
          });
        });
      });
    });

    // global security refs
    (spec.security || []).forEach(function (sec) {
      Object.keys(sec || {}).forEach(function (name) {
        if (!schemes[name]) err("global security scheme `" + name + "` is not defined in components.securitySchemes", "security");
      });
    });

    // $ref resolution across the document
    var refs = [];
    walkRefs(spec, "", refs);
    refs.forEach(function (r) {
      if (r.ref.charAt(0) !== "#") { warn("external $ref `" + r.ref + "` not checked here", r.where); return; }
      if (deref(spec, r.ref) === undefined) err("broken $ref `" + r.ref + "` — nothing exists at that pointer", r.where || "document");
    });

    // schema sanity
    var schemas = (spec.components && spec.components.schemas) || {};
    Object.keys(schemas).forEach(function (name) {
      var s = schemas[name];
      if (!s || typeof s !== "object") { err("schema `" + name + "` is not an object", "components.schemas"); return; }
      if (s.type && ["object", "array", "string", "number", "integer", "boolean", "null"].indexOf(s.type) === -1)
        err("schema `" + name + "`: `type: " + s.type + "` is not a valid JSON Schema type", "components.schemas");
      if (Array.isArray(s.required) && s.properties) {
        s.required.forEach(function (rq) {
          if (!s.properties[rq]) err("schema `" + name + "` requires `" + rq + "` but doesn't define it in properties", "components.schemas");
        });
      }
      if (s.type === "array" && !s.items) err("schema `" + name + "` is an array with no `items`", "components.schemas");
    });

    return { errors: errors, warnings: warnings, spec: spec, parseError: null };
  }

  // Build a renderable doc model from a parsed spec.
  function docModel(spec) {
    var out = [];
    if (!spec || !spec.paths) return out;
    Object.keys(spec.paths).forEach(function (pth) {
      var item = spec.paths[pth] || {};
      METHODS.forEach(function (m) {
        var op = item[m];
        if (!op || typeof op !== "object") return;
        var params = [].concat(item.parameters || [], op.parameters || []).map(function (prm) {
          if (prm && prm.$ref) prm = deref(spec, prm.$ref) || prm;
          if (!prm || !prm.name) return null;
          var t = (prm.schema && prm.schema.type) || "";
          return prm.name + " (" + prm.in + (prm.required ? ", required" : "") + (t ? ", " + t : "") + ")";
        }).filter(Boolean);

        var body = null;
        if (op.requestBody) {
          var rb = op.requestBody.$ref ? deref(spec, op.requestBody.$ref) : op.requestBody;
          if (rb && rb.content) {
            var mt = Object.keys(rb.content)[0];
            var sch = rb.content[mt] && rb.content[mt].schema;
            var refName = sch && sch.$ref ? sch.$ref.split("/").pop() : null;
            if (!refName && sch) { sch = sch; }
            var fields = "";
            var real = sch && sch.$ref ? deref(spec, sch.$ref) : sch;
            if (real && real.properties) fields = Object.keys(real.properties).join(", ");
            body = (refName || (real && real.type) || mt) + (fields ? " (" + fields + ")" : "");
          }
        }

        var responses = Object.keys(op.responses || {}).map(function (code) {
          var r = op.responses[code];
          if (r && r.$ref) r = deref(spec, r.$ref) || r;
          var schema = null;
          if (r && r.content) {
            var cmt = Object.keys(r.content)[0];
            var cs = r.content[cmt] && r.content[cmt].schema;
            if (cs && cs.$ref) schema = cs.$ref.split("/").pop();
            else if (cs && cs.type) schema = cs.type;
          }
          return { code: code, desc: (r && r.description) || "", schema: schema };
        });

        var secured = op.security ? op.security.length > 0 : (spec.security || []).length > 0;

        out.push({ method: m.toUpperCase(), path: pth, summary: op.summary || op.operationId || "", auth: secured, params: params, body: body, responses: responses, deprecated: !!op.deprecated });
      });
    });
    return out;
  }

  AV.OpenAPI = { parse: parse, validate: validate, docModel: docModel, deref: deref };
})();
