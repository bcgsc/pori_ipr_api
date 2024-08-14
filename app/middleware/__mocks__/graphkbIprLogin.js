const graphkbIprLoginMiddleware = async (req, _, next) => {
  req.graphkbToken = 'mockGraphKbToken';
  return next();
};

module.exports = graphkbIprLoginMiddleware;
