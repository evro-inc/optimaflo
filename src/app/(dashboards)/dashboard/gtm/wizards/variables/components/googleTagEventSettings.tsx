import React, { useEffect } from 'react';
import { useFormContext, useFieldArray, useWatch } from 'react-hook-form';
import { FormControl, FormField } from '@/src/components/ui/form';
import { Input } from '@/src/components/ui/input';
import { Button } from '@/src/components/ui/button';

interface Props {
  formIndex: number;
  type: string;
  table?: any;
}

const GoogleTagEventSettings = ({ formIndex }: Props) => {
  const { control, register } = useFormContext();
  const { fields, replace } = useFieldArray({
    control,
    name: `forms.${formIndex}.parameter`,
  });

  const variableType = useWatch({
    control,
    name: `forms.${formIndex}.type`,
  });

  useEffect(() => {
    if (variableType === 'gtes') {
      replace([
        {
          type: 'list',
          key: 'eventSettingsTable',
          list: [
            {
              type: 'map',
              map: [
                { type: 'template', key: 'parameter', value: '' },
                { type: 'template', key: 'parameterValue', value: '' },
              ],
            },
          ],
        },
        {
          type: 'list',
          key: 'userProperties',
          list: [
            {
              type: 'map',
              map: [
                { type: 'template', key: 'name', value: '' },
                { type: 'template', key: 'value', value: '' },
              ],
            },
          ],
        },
      ]);
    }
  }, [variableType, replace]);

  const {
    fields: eventSettingsMapFields,
    append: eventSettingsAppendMap,
    remove: eventSettingsRemoveMap,
  } = useFieldArray({
    control,
    name: `forms.${formIndex}.parameter.${fields.findIndex(
      (field: any) => field.key === 'eventSettingsTable'
    )}.list`,
  });

  const {
    fields: userPropertiesMapFields,
    append: userPropertiesAppendMap,
    remove: userPropertiesRemoveMap,
  } = useFieldArray({
    control,
    name: `forms.${formIndex}.parameter.${fields.findIndex(
      (field: any) => field.key === 'userProperties'
    )}.list`,
  });

  const handleAddEventSettingsRow = () => {
    eventSettingsAppendMap({
      type: 'map',
      map: [
        { type: 'template', key: 'parameter', value: '' },
        { type: 'template', key: 'parameterValue', value: '' },
      ],
    });
  };

  const handleAddUserPropertiesRow = () => {
    userPropertiesAppendMap({
      type: 'map',
      map: [
        { type: 'template', key: 'name', value: '' },
        { type: 'template', key: 'value', value: '' },
      ],
    });
  };

  return (
    <div>
      {fields.map((item: any, index: number) => (
        <div key={item.id}>
          {item.key === 'eventSettingsTable' && (
            <div className="pt-4">
              <div className="flex items-center space-x-2">
                <label
                  htmlFor={`config-settings-table-${formIndex}`}
                  className="text-sm font-medium leading-none mb-5"
                >
                  Config Parameter
                </label>
              </div>
              <div className="space-y-4">
                {eventSettingsMapFields.map((mapItem: any, mapIndex: number) => (
                  <div key={mapItem.id} className="grid grid-cols-3 gap-4">
                    {Array.isArray(mapItem.map) &&
                      mapItem.map.map((subItem, subIndex) => (
                        <React.Fragment key={subIndex}>
                          {subItem.key === 'parameter' && (
                            <FormField
                              control={control}
                              name={`forms.${formIndex}.parameter.${index}.list.${mapIndex}.map.${subIndex}.value`}
                              render={({ field }) => (
                                <FormControl>
                                  <Input
                                    {...register(
                                      `forms.${formIndex}.parameter.${index}.list.${mapIndex}.map.${subIndex}.value`
                                    )}
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Input"
                                  />
                                </FormControl>
                              )}
                            />
                          )}
                          {subItem.key === 'parameterValue' && (
                            <FormField
                              control={control}
                              name={`forms.${formIndex}.parameter.${index}.list.${mapIndex}.map.${subIndex}.value`}
                              render={({ field }) => (
                                <FormControl>
                                  <Input
                                    {...register(
                                      `forms.${formIndex}.parameter.${index}.list.${mapIndex}.map.${subIndex}.value`
                                    )}
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Output"
                                  />
                                </FormControl>
                              )}
                            />
                          )}
                        </React.Fragment>
                      ))}
                    <Button type="button" onClick={() => eventSettingsRemoveMap(mapIndex)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" className="mt-5" onClick={handleAddEventSettingsRow}>
                + Add Row
              </Button>
            </div>
          )}

          {item.key === 'userProperties' && (
            <div className="pt-4">
              <div className="flex items-center space-x-2">
                <label
                  htmlFor={`config-settings-table-${formIndex}`}
                  className="text-sm font-medium leading-none mb-5"
                >
                  Google Analytics User Properties
                </label>
              </div>
              <div className="space-y-4">
                {userPropertiesMapFields.map((mapItem: any, mapIndex: number) => (
                  <div key={mapItem.id} className="grid grid-cols-3 gap-4">
                    {Array.isArray(mapItem.map) &&
                      mapItem.map.map((subItem, subIndex) => (
                        <React.Fragment key={subIndex}>
                          {subItem.key === 'name' && (
                            <FormField
                              control={control}
                              name={`forms.${formIndex}.parameter.${index}.list.${mapIndex}.map.${subIndex}.value`}
                              render={({ field }) => (
                                <FormControl>
                                  <Input
                                    {...register(
                                      `forms.${formIndex}.parameter.${index}.list.${mapIndex}.map.${subIndex}.value`
                                    )}
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Input"
                                  />
                                </FormControl>
                              )}
                            />
                          )}
                          {subItem.key === 'value' && (
                            <FormField
                              control={control}
                              name={`forms.${formIndex}.parameter.${index}.list.${mapIndex}.map.${subIndex}.value`}
                              render={({ field }) => (
                                <FormControl>
                                  <Input
                                    {...register(
                                      `forms.${formIndex}.parameter.${index}.list.${mapIndex}.map.${subIndex}.value`
                                    )}
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Output"
                                  />
                                </FormControl>
                              )}
                            />
                          )}
                        </React.Fragment>
                      ))}
                    <Button type="button" onClick={() => userPropertiesRemoveMap(mapIndex)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" className="mt-5" onClick={handleAddUserPropertiesRow}>
                + Add Row
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default GoogleTagEventSettings;
