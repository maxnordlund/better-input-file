var express = require("express"),
    bodyParser = require("body-parser"),
    port = process.env.PORT || 3000,
    app = express()

app.use(bodyParser.json())

app.get("/", function(req, res) {
  console.log("Served root")
  res.sendFile("/index.html", { root: __dirname })
})

app.post("/process", function (req, res) {
  res.json({ ok: true })
  console.log("Process file")
  console.log(req.body)
})

var files = ["index.html", "directive.js", "autoload.js"]
files.forEach(function (file) {
  app.get("/"+file, function (req, res) {
    console.log("Served", file)
    res.sendFile(file, { root: __dirname })
  })
})

var signals = ["SIGINT", "SIGTERM"]
signals.forEach(function (signal) {
  process.on(signal, function() {
    process.exit(0)
  })
})

process.on("exit", function() {
  console.log("Shuting down")
})

app.listen(port, function() {
  console.log("Listening on http://localhost:" + port)
})

