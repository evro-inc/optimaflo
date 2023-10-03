// variableTypes.js
export const firstPartyCookie = async (
  decodeCookie: string,
  cookieName: string,
  convertNullToValue: string,
  convertUndefinedToValue: string,
  convertTrueToValue: string,
  convertFalseToValue: string
) => {
  const parameter = [
    {
      type: 'boolean',
      key: 'decodeCookie',
      value: decodeCookie,
    },
    {
      type: 'template',
      key: 'name',
      value: cookieName,
    },
  ];
  const formatValue = {
    caseConversionType: 'lowercase',
    convert_null_to_value: {
      type: 'template',
      value: convertNullToValue,
    },
    convert_undefined_to_value: {
      type: 'template',
      value: convertUndefinedToValue,
    },
    convert_true_to_value: {
      type: 'template',
      value: convertTrueToValue,
    },
    convert_false_to_value: {
      type: 'template',
      value: convertFalseToValue,
    },
  };
  return { parameter: parameter, formatValue };
};

export const aev = async (
  variableType: string,
  urlComponentType: string | null,
  extraParam: string,
  defaultValue: string,
  convertNullToValue: string,
  convertUndefinedToValue: string,
  convertTrueToValue: string,
  convertFalseToValue: string
) => {
  let param: any = null;
  let addParam: any = null;

  if (variableType === 'URL') {
    param = {
      type: 'template',
      key: 'component',
      value: urlComponentType,
    };
  }

  switch (urlComponentType) {
    case 'HOST':
      addParam = {
        type: 'boolean',
        key: 'stripWww',
        value: extraParam, // Bool
      };
      break;
    case 'PATH':
      addParam = {
        type: 'list',
        key: 'defaultPages',
        list: [{ type: 'template', value: extraParam }],
      };
      break;
    case 'QUERY':
      addParam = {
        type: 'template',
        key: 'queryKey',
        value: extraParam,
      };
      break;
    case 'IS_OUTBOUND':
      addParam = {
        type: 'template',
        key: 'affiliatedDomains',
        value: extraParam,
      };
      break;
    default:
      break;
  }

  const element = [
    { type: 'boolean', key: 'setDefaultValue', value: 'true' },
    { type: 'template', key: 'varType', value: variableType },
    {
      type: 'template',
      key: 'defaultValue',
      value: defaultValue,
    },
    param,
    addParam,
  ];

  const formatValue = {
    caseConversionType: 'lowercase',
    convert_null_to_value: {
      type: 'template',
      value: convertNullToValue,
    },
    convert_undefined_to_value: {
      type: 'template',
      value: convertUndefinedToValue,
    },
    convert_true_to_value: {
      type: 'template',
      value: convertTrueToValue,
    },
    convert_false_to_value: {
      type: 'template',
      value: convertFalseToValue,
    },
  };
  return { parameter: element, formatValue };
};

export const constantString = async (
  constantValue: string,
  variableName: string,
  convertNull: string,
  convertUndefined: string,
  convertTrue: string,
  convertFalse: string
) => {
  const param = [{ type: 'template', key: 'value', value: constantValue }];

  const convertValue = {
    caseConversionType: 'lowercase',
    convertNullToValue: {
      type: 'template',
      value: convertNull,
    },
    convertUndefinedToValue: {
      type: 'template',
      value: convertUndefined,
    },
    convertTrueToValue: {
      type: 'template',
      value: convertTrue,
    },
    convertFalseToValue: {
      type: 'template',
      value: convertFalse,
    },
  };

  const body = {
    name: variableName,
    type: 'c',
    parameter: param,
    formatValue: convertValue,
  };

  // Here you would normally make the API request, but for the purposes of this example, we'll just return the body.
  return body;
};
