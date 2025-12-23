const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static("public"));

// Memory (Target Object)
let db = { user: "guest", role: "user" };
let traceLog = [];
let stepCounter = 0;

// Step-by-step logging function
function logStep(line, description, type, vars) {
  stepCounter++;

  // Handle specific display for target
  let targetDisplay = vars.target;
  if (vars.key === "__proto__" && vars.target) {
    targetDisplay = "Object.prototype (GLOBAL)";
  }

  const step = {
    stepNum: stepCounter,
    line,
    description,
    type,
    vars: {
      source: safeClone(vars.source),
      target:
        targetDisplay === "Object.prototype (GLOBAL)"
          ? targetDisplay
          : safeClone(vars.target),
      key: vars.key,
    },
  };

  traceLog.push(step);
}

// Safe cloning to prevent circular references during logging
function safeClone(obj, depth = 0, maxDepth = 3) {
  if (depth > maxDepth) return "...";
  if (obj === null || typeof obj !== "object") return obj;
  if (obj === Object.prototype) return "Object.prototype (GLOBAL)";

  try {
    const cloned = Array.isArray(obj) ? [] : {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = safeClone(obj[key], depth + 1, maxDepth);
      }
    }
    return cloned;
  } catch (e) {
    return "...";
  }
}

// VULNERABLE RECURSIVE MERGE FUNCTION
const recursiveMerge = (target, source, depth = 0) => {
  // Start
  if (depth === 0) {
    logStep(1, " Merge function started", "info", {
      target,
      source,
      key: null,
    });
  }

  // Loop through keys
  for (const key in source) {
    logStep(3, ` Key iteration: "${key}"`, "loop", {
      target,
      source,
      key,
    });

    // If value is an object
    if (source[key] && typeof source[key] === "object") {
      logStep(5, ` "${key}" is an object, deep merge required`, "check", {
        target,
        source,
        key,
      });

      // If key doesn't exist in target, create empty object
      if (!target[key]) {
        target[key] = {};
        logStep(7, ` target["${key}"] = {} (Created new object)`, "create", {
          target,
          source,
          key,
        });
      }

      // CRITICAL POINT: __proto__ check missing
      if (key === "__proto__") {
        logStep(9, ` DANGER! "__proto__" key detected!`, "danger", {
          target: Object.prototype,
          source: source[key],
          key,
        });

        logStep(9, ` Writing to Global Object.prototype...`, "danger", {
          target: "Object.prototype (GLOBAL)",
          source: source[key],
          key,
        });
      } else {
        logStep(9, ` Calling recursive merge...`, "recursion", {
          target,
          source,
          key,
        });
      }

      // Recursive call (VULNERABILITY IS HERE)
      recursiveMerge(target[key], source[key], depth + 1);
    } else {
      // Simple value assignment
      target[key] = source[key];
      logStep(
        12,
        ` target["${key}"] = "${source[key]}" (Simple assignment)`,
        "success",
        {
          target,
          source,
          key,
        },
      );
    }
  }

  // Function end
  if (depth === 0) {
    logStep(15, " Merge function completed", "complete", {
      target,
      source,
      key: null,
    });
  }
};

// API: Receive Payload (Capture with Burp Suite)
app.post("/api/save", (req, res) => {
  traceLog = [];
  stepCounter = 0;
  const payload = req.body;

  console.log(" Incoming Payload:", JSON.stringify(payload, null, 2));

  try {
    recursiveMerge(db, payload);

    // Pollution check
    const isPolluted = Object.prototype.isAdmin === true;

    console.log(" DB State:", db);
    console.log(" Pollution Test:", {
      isPolluted,
      testObject: {},
      testObjectHasIsAdmin: {}.isAdmin,
    });

    res.json({
      status: "success",
      dbState: db,
      polluted: isPolluted,
    });
  } catch (e) {
    console.error("❌ Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// API: Get Trace Data
app.get("/api/trace", (req, res) => {
  const isPolluted = Object.prototype.isAdmin === true;

  res.json({
    steps: traceLog,
    pollutionStatus: {
      isPolluted,
      affectedProperty: isPolluted ? "isAdmin" : null,
      proof: isPolluted ? "({}).isAdmin === true" : null,
    },
    dbState: db,
  });
});

// API: Reset
app.post("/api/reset", (req, res) => {
  // Clean global pollution
  delete Object.prototype.isAdmin;

  // Reset DB
  db = { user: "guest", role: "user" };
  traceLog = [];
  stepCounter = 0;

  console.log("🧹 Lab cleaned");

  res.json({
    status: "cleaned",
    message: "Lab successfully reset",
  });
});

// API: Test Endpoint - Check Pollution
app.get("/api/check-pollution", (req, res) => {
  const testObj = {};
  res.json({
    isPolluted: Object.prototype.isAdmin === true,
    testObject: testObj,
    testObjectHasIsAdmin: testObj.isAdmin,
    proof: "const obj = {}; obj.isAdmin = " + testObj.isAdmin,
  });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║    Prototype Pollution Deep Lab v2.0    ║
║    http://localhost:${PORT}             ║
║    Security Education Simulator         ║
╚═══════════════════════════════════════════╝

 Usage:
1. Open http://localhost:${PORT} in browser
2. Start Burp Suite and set up proxy
3. Click "Save (Send POST)"
4. Capture the request in Burp
5. Add this to JSON payload:
   "__proto__": { "isAdmin": true }
6. Forward and watch the animation!

 Normal Payload:
{
  "username": "admin_wannabe",
  "preferences": { "theme": "dark" }
}

 Attack Payload:
{
  "username": "admin_wannabe",
  "preferences": { "theme": "dark" },
  "__proto__": { "isAdmin": true }
}
  `);
});
