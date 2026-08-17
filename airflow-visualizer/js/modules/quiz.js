/* ============================================================
   modules/quiz.js — interactive knowledge check
   Interactive: multiple-choice with scoring and explanations.
   ============================================================ */
(function () {
  "use strict";
  var AV = (window.AirflowViz = window.AirflowViz || {});

  var QUESTIONS = [
    {
      q: "A daily DAG has <code>logical_date = 2024-01-15</code>. When does its run actually execute?",
      options: [
        "At the start of Jan 15 (00:00)",
        "At the end of the interval — early Jan 16",
        "Immediately when the DAG is unpaused",
        "Exactly at noon on Jan 15"
      ],
      answer: 1,
      why: "A run represents a data interval and fires at its <b>end</b>, so all of Jan 15's data is complete before processing. logical_date is the interval's start, not the execution time."
    },
    {
      q: "100 sensors are waiting on external files, each holding a worker slot. What fixes the slot exhaustion?",
      options: [
        "Increase retry_delay",
        "Set catchup=False",
        "Use deferrable operators / the triggerer",
        "Add more XComs"
      ],
      answer: 2,
      why: "Deferrable operators <b>yield their worker slot</b> and hand the wait to the triggerer's async event loop, which watches thousands of conditions without occupying workers."
    },
    {
      q: "Which is the correct way to pass a 2 GB DataFrame between two tasks?",
      options: [
        "Return it directly via XCom",
        "Store it as an Airflow Variable",
        "Write it to S3/warehouse and pass the path via XCom",
        "Put it in the DAG's params"
      ],
      answer: 2,
      why: "XCom lives in the metadata DB and is for <b>small</b> values. Persist large data externally and pass only a <b>pointer</b> (path/table) through XCom."
    },
    {
      q: "How do multiple active-active schedulers avoid scheduling the same task twice?",
      options: [
        "A ZooKeeper leader election",
        "DB row-level locking (SELECT … FOR UPDATE SKIP LOCKED)",
        "A Redis distributed lock",
        "Only one scheduler is ever active"
      ],
      answer: 1,
      why: "Schedulers coordinate purely through the metadata DB using <code>SKIP LOCKED</code> row locking — no external coordinator, no leader election, no single point of failure."
    },
    {
      q: "A task shows <span class='state-chip running'>running</span> in the UI but its worker pod was OOMKilled. What happens?",
      options: [
        "It runs forever and blocks downstream tasks",
        "The scheduler reaps it as a zombie → up-for-retry",
        "It is silently marked success",
        "The DAG run is deleted"
      ],
      answer: 1,
      why: "The heartbeat goes stale; <b>zombie detection</b> reaps it after <code>scheduler_zombie_task_threshold</code> and marks it up-for-retry so <code>retries</code> can recover it."
    },
    {
      q: "With <code>retries=3</code> and <code>retry_exponential_backoff=True</code> (retry_delay=5m), the wait before attempt 3 is:",
      options: [ "5 minutes", "10 minutes", "15 minutes", "20 minutes" ],
      answer: 1,
      why: "Delay = retry_delay × 2^(try-1). Before attempt 3, try=2 → 5 × 2¹ = <b>10 minutes</b> (attempt 2 waited 5m, attempt 3 waits 10m), capped by max_retry_delay."
    },
    {
      q: "Which component is the single stateful source of truth you must back up?",
      options: [
        "The Celery broker (Redis)",
        "The scheduler's local disk",
        "The metadata database",
        "The triggerer process"
      ],
      answer: 2,
      why: "Schedulers, workers, and API servers are stateless and recreatable. The <b>metadata DB</b> holds all DAG-run and task state — protect and back it up with an HA setup."
    },
    {
      q: "Why must top-level DAG-file code stay cheap?",
      options: [
        "It runs once at deploy time only",
        "The scheduler re-imports the file every parse loop",
        "It counts against XCom storage",
        "It blocks the Celery broker"
      ],
      answer: 1,
      why: "The scheduler <b>re-parses every DAG file</b> on each loop. Expensive top-level imports or network calls stall parsing for all DAGs — keep real work inside task callables."
    }
  ];

  var module = {
    id: "quiz",
    title: "Quiz",
    fullWidth: true,
    _root: null, _handler: null, _state: null,

    render: function (container) {
      var self = this;
      this._state = { idx: 0, score: 0, answered: false };

      container.innerHTML =
        '<div class="module-header animate-fade-in-up">' +
          '<div class="module-eyebrow">Apache Airflow · Knowledge Check</div>' +
          '<h1 class="module-title">Quiz: test your Airflow internals</h1>' +
          '<p class="module-subtitle">Eight questions drawn from the trickiest corners of Airflow behaviour. ' +
          "Pick an answer to see whether you're right — and exactly why.</p>" +
        "</div>" +
        '<div class="quiz-shell" id="quiz-shell"></div>';

      var shell = container.querySelector("#quiz-shell");
      this._root = container;

      function renderQuestion() {
        var st = self._state;
        var q = QUESTIONS[st.idx];
        st.answered = false;
        shell.innerHTML =
          '<div class="quiz-progress">' +
            '<span class="quiz-counter">Question ' + (st.idx + 1) + " / " + QUESTIONS.length + "</span>" +
            '<span class="quiz-score">Score: ' + st.score + "</span>" +
            '<div class="quiz-bar"><div class="quiz-bar-fill" style="width:' +
              ((st.idx) / QUESTIONS.length * 100) + '%"></div></div>' +
          "</div>" +
          '<div class="quiz-card">' +
            '<div class="quiz-q">' + q.q + "</div>" +
            '<div class="quiz-options" id="quiz-options">' +
              q.options.map(function (o, i) {
                return '<button class="quiz-option" data-i="' + i + '">' +
                  '<span class="quiz-opt-key">' + String.fromCharCode(65 + i) + "</span>" +
                  '<span class="quiz-opt-text">' + o + "</span></button>";
              }).join("") +
            "</div>" +
            '<div class="quiz-feedback" id="quiz-feedback" hidden></div>' +
          "</div>";
      }

      function renderResult() {
        var st = self._state;
        var pct = Math.round(st.score / QUESTIONS.length * 100);
        var verdict = pct === 100 ? "Flawless — you know Airflow cold. 🏆"
          : pct >= 75 ? "Strong — you'd hold your own in a senior interview. 💪"
          : pct >= 50 ? "Solid base — revisit scheduling and execution internals. 📚"
          : "Good start — walk the animated modules and try again. 🌱";
        shell.innerHTML =
          '<div class="quiz-card quiz-result">' +
            '<div class="quiz-result-score gradient-text">' + st.score + " / " + QUESTIONS.length + "</div>" +
            '<div class="quiz-result-pct">' + pct + "%</div>" +
            "<p class='quiz-result-verdict'>" + verdict + "</p>" +
            '<button class="btn btn-primary" id="quiz-restart">Try again ↻</button>' +
          "</div>";
      }

      function onClick(e) {
        var st = self._state;
        var opt = e.target.closest(".quiz-option");
        if (opt && !st.answered) {
          st.answered = true;
          var chosen = parseInt(opt.getAttribute("data-i"), 10);
          var q = QUESTIONS[st.idx];
          var correct = chosen === q.answer;
          if (correct) st.score++;
          var btns = shell.querySelectorAll(".quiz-option");
          btns.forEach(function (b, i) {
            b.disabled = true;
            if (i === q.answer) b.classList.add("quiz-correct");
            else if (i === chosen) b.classList.add("quiz-wrong");
          });
          var fb = shell.querySelector("#quiz-feedback");
          fb.hidden = false;
          fb.className = "quiz-feedback " + (correct ? "quiz-fb-right" : "quiz-fb-wrong");
          fb.innerHTML =
            '<div class="quiz-fb-head">' + (correct ? "✓ Correct" : "✗ Not quite") + "</div>" +
            "<p>" + q.why + "</p>" +
            '<button class="btn btn-primary quiz-next" id="quiz-next">' +
              (st.idx === QUESTIONS.length - 1 ? "See results →" : "Next question →") + "</button>";
          return;
        }
        if (e.target.id === "quiz-next") {
          st.idx++;
          if (st.idx >= QUESTIONS.length) renderResult();
          else renderQuestion();
          return;
        }
        if (e.target.id === "quiz-restart") {
          self._state = { idx: 0, score: 0, answered: false };
          renderQuestion();
        }
      }

      this._handler = onClick;
      container.addEventListener("click", onClick);
      renderQuestion();
    },

    destroy: function () {
      if (this._root && this._handler) this._root.removeEventListener("click", this._handler);
      this._root = null; this._handler = null; this._state = null;
    }
  };

  AV.registerModule(module);
})();
