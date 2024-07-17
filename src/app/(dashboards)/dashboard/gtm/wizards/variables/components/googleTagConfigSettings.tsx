'use client';

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

const GoogleTagConfigSettings = ({ formIndex, type, table = [] }: Props) => {
  const { control, register, setValue } = useFormContext();
  const { fields, append } = useFieldArray({
    control,
    name: `forms.${formIndex}.variables.parameter`,
  });

  const variableType = useWatch({
    control,
    name: `forms.${formIndex}.variables.type`,
  });

  const {
    fields: mapFields,
    append: appendMap,
    remove: removeMap,
  } = useFieldArray({
    control,
    name: `forms.${formIndex}.variables.parameter.${fields.findIndex(
      (field: any) => field.key === 'configSettingsTable'
    )}.list`,
  });

  useEffect(() => {
    if (fields.length === 0) {
      append({
        type: 'list',
        key: 'configSettingsTable',
        list: [
          {
            type: 'map',
            map: [
              { type: 'template', key: 'parameter', value: '' },
              { type: 'template', key: 'parameterValue', value: '' },
            ],
          },
        ],
      });
    }
  }, [fields, append]);

  useEffect(() => {
    if (variableType === 'gtcs') {
      setValue(`forms.${formIndex}.variables.parameter`, [
        {
          type: 'list',
          key: 'configSettingsTable',
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
      ]);
    }
  }, [variableType, setValue, formIndex]);

  return (
    <div>
      {fields.map((item: any, index: number) => (
        <div key={item.id}>
          {item.key === 'configSettingsTable' && (
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
                {mapFields.map((mapItem, mapIndex) => (
                  <div key={mapItem.id} className="grid grid-cols-3 gap-4">
                    {mapItem.map.map((subItem: any, subIndex: number) => (
                      <React.Fragment key={subIndex}>
                        {subItem.key === 'parameter' && (
                          <FormField
                            control={control}
                            name={`forms.${formIndex}.variables.parameter.${index}.list.${mapIndex}.map.${subIndex}.value`}
                            render={({ field }) => (
                              <FormControl>
                                <Input
                                  {...register(
                                    `forms.${formIndex}.variables.parameter.${index}.list.${mapIndex}.map.${subIndex}.value`
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
                            name={`forms.${formIndex}.variables.parameter.${index}.list.${mapIndex}.map.${subIndex}.value`}
                            render={({ field }) => (
                              <FormControl>
                                <Input
                                  {...register(
                                    `forms.${formIndex}.variables.parameter.${index}.list.${mapIndex}.map.${subIndex}.value`
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
                    <Button type="button" onClick={() => removeMap(mapIndex)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                className="mt-5"
                onClick={() =>
                  appendMap({
                    type: 'map',
                    map: [
                      { type: 'template', key: 'parameter', value: '' },
                      { type: 'template', key: 'parameterValue', value: '' },
                    ],
                  })
                }
              >
                + Add Row
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default GoogleTagConfigSettings;
