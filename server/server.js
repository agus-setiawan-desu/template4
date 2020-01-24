const { Nuxt } = require('nuxt')
const express = require('express')
const port = process.env.PORT || 8080

const app = express()
const nuxtConfig = require('../nuxt.config.js')

// Instantiate Nuxt
const nuxt = new Nuxt(nuxtConfig)
app.use(nuxt.render)

app.listen(port, () => {
  console.log(`Nshop App @ Port ${port}`)
})