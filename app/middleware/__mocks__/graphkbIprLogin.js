const graphkbIprLoginMiddleware = async (req, _, next) => {
  req.graphkbToken = null;
  return next();
};

module.exports = graphkbIprLoginMiddleware;
