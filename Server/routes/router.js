const express = require("express");
const route = express.Router();
const services = require("../services/render");

route.get("/", services.video_chat);

module.exports = route;
