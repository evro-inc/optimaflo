import Joi from 'joi';

export const aevValidationSchema = Joi.array().items(
  Joi.object({
    type: Joi.string().valid('boolean', 'template').required(),
    key: Joi.string()
      .valid(
        'setDefaultValue',
        'varType',
        'defaultValue',
        'attribute',
        'stripWww',
        'component'
      )
      .required(),
    value: Joi.alternatives().try(Joi.string(), Joi.boolean()).required(),
  }),
  Joi.valid(null)
);

export const firstPartyCookieValidationSchema = Joi.array().items(
  Joi.object({
    type: 'boolean', // Add validation for the 'type' property
    key: 'decodeCookie',
    value: Joi.string().valid('true', 'false').required(), // Use valid() to specify allowed string values
  }),
  Joi.object({
    type: 'template', // Add validation for the 'type' property
    key: 'name',
    value: Joi.string().required(), // Use valid() to specify allowed string values
  })
);
