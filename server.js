var express = require("express"),
    bodyParser = require("body-parser"),
    port = process.env.PORT || 3000,
    app = express()

app.use(function logger(req, res, next) {
  console.log((new Date).toTimeString(), req.method, req.originalUrl)
  next()
})
app.use(express["static"](__dirname))
app.use(bodyParser.json())

app.post("/process", function (req, res) {
  res.json({ ok: true })
  console.log("Process file")
  console.log(req.body)
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

