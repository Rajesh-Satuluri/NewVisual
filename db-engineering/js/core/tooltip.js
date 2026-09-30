/* ============================================================
   Tooltip System — declarative data-tooltip hover tooltips
   ============================================================ */

(function () {
  'use strict';

  const Tooltip = {
    _el: null,
    _visible: false,
    _hideTimer: null,

    init() {
      this._el = document.getElementById('tooltip');
      if (!this._el) {
        this._el = document.createElement('div');
        this._el.id = 'tooltip';
        this._el.setAttribute('role', 'tooltip');
        document.body.appendChild(this._el);
      }
      document.addEventListener('mouseover', this._onMouseOver.bind(this));
      document.addEventListener('mouseout', this._onMouseOut.bind(this));
      document.addEventListener('mousemove', this._onMouseMove.bind(this));
      document.addEventListener('scroll', () => this.hide(), true);
    },

    show(content, x, y) {
      clearTimeout(this._hideTimer);
      if (!content) { this.hide(); return; }

      // Support HTML strings or plain text
      if (content.startsWith('<')) {
        this._el.innerHTML = content;
      } else {
        this._el.textContent = content;
      }

      this._el.classList.add('visible');
      this._visible = true;
      this._position(x, y);
    },

    hide() {
      if (!this._visible) return;
      this._el.classList.remove('visible');
      this._visible = false;
    },

    _onMouseOver(e) {
      const target = e.target.closest('[data-tooltip]');
      if (!target) return;
      clearTimeout(this._hideTimer);
      const content = target.dataset.tooltip;
      const title = target.dataset.tooltipTitle;
      const html = title
        ? '<strong>' + title + '</strong>' + content
        : content;
      this._hideTimer = setTimeout(() => {
        this.show(html, e.clientX, e.clientY);
      }, 150);
    },

    _onMouseOut(e) {
      if (!e.target.closest('[data-tooltip]')) return;
      clearTimeout(this._hideTimer);
      this._hideTimer = setTimeout(() => this.hide(), 100);
    },

    _onMouseMove(e) {
      if (!this._visible) return;
      this._position(e.clientX, e.clientY);
    },

    _position(x, y) {
      const el = this._el;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const rect = el.getBoundingClientRect();
      const PAD = 12;

      let left = x + PAD;
      let top = y + PAD;

      if (left + rect.width > W - PAD) left = x - rect.width - PAD;
      if (top + rect.height > H - PAD) top = y - rect.height - PAD;

      el.style.left = Math.max(PAD, left) + 'px';
      el.style.top  = Math.max(PAD, top)  + 'px';
    },
  };

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.Tooltip = Tooltip;
})();
