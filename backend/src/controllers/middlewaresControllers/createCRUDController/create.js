const create = async (Model, req, res) => {

  req.body.removed = false;
  const result = await new Model({
    ...req.body,
  }).save();

 
  return res.status(200).json({
    success: true,
    result,
    message: 'Successfully Created the document in Model ',
  });
};

module.exports = create;
