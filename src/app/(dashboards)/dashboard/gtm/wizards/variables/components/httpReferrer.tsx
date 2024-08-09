import React, { useEffect } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/src/components/ui/form';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { httpReferrerType } from '../../../configurations/@variables/items';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Textarea } from '@/src/components/ui/textarea';
import { Input } from '@/src/components/ui/input';

interface Props {
  formIndex: number;
  variables: any;
}

const HttpReferrer = ({ formIndex }: Props) => {
  const { control, setValue } = useFormContext();
  const { fields, append } = useFieldArray({
    control,
    name: `forms.${formIndex}.parameter`,
  });

  const variableType = useWatch({
    control,
    name: `forms.${formIndex}.type`,
  });

  const parameterFields = useWatch({
    control,
    name: `forms.${formIndex}.parameter`,
  });

  // Append default fields if fields are empty
  useEffect(() => {
    if (fields.length === 0) {
      append({ type: 'template', key: 'component', value: 'URL' });
      append({ type: 'template', key: 'customUrlSource', value: '' });
    }
  }, [fields.length, append]);

  // Watch for changes in variable type and update parameters accordingly
  useEffect(() => {
    if (variableType === 'f') {
      setValue(`forms.${formIndex}.parameter`, [
        { type: 'template', key: 'component', value: 'URL' },
        { type: 'template', key: 'customUrlSource', value: '{{pageUrl}}' },
      ]);
    }
  }, [variableType, setValue, formIndex]);

  // Append additional fields based on component type
  useEffect(() => {
    const varTypeValue = parameterFields?.find((param) => param.key === 'component')?.value;

    if (varTypeValue === 'HOST' && !parameterFields.some((param) => param.key === 'stripWww')) {
      append({ type: 'boolean', key: 'stripWww', value: '' });
    }

    if (varTypeValue === 'PATH' && !parameterFields.some((param) => param.key === 'defaultPages')) {
      append({ type: 'list', key: 'defaultPages', list: [{ type: 'template', value: '' }] });
    }

    if (varTypeValue === 'QUERY' && !parameterFields.some((param) => param.key === 'queryKey')) {
      append({ type: 'template', key: 'queryKey', value: '' });
    }
  }, [parameterFields, append]);

  const isHostnameSelected = parameterFields.some(
    (param) => param.key === 'component' && param.value === 'HOST'
  );
  const isPathSelected = parameterFields.some(
    (param) => param.key === 'component' && param.value === 'PATH'
  );
  const isQuerySelected = parameterFields.some(
    (param) => param.key === 'component' && param.value === 'QUERY'
  );

  const handleDefaultPagesChange = (e: React.ChangeEvent<HTMLTextAreaElement>, index: number) => {
    const lines = e.target.value.split('\n').map((line) => ({ type: 'template', value: line }));
    setValue(`forms.${formIndex}.parameter.${index}.list`, lines);
  };

  return (
    <div>
      <FormLabel>URL</FormLabel>
      <FormDescription>Select a component type.</FormDescription>
      {fields.map((item, index) => (
        <div className="py-3" key={item.id}>
          {item.key === 'component' && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Component Type</FormLabel>
                  <FormControl>
                    <Select {...field} value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a variable type." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Variable Type</SelectLabel>
                          {httpReferrerType.map((variable) => (
                            <SelectItem key={variable.type} value={variable.type}>
                              {variable.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {item.key === 'stripWww' && isHostnameSelected && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Strip www.</FormLabel>
                  <FormControl>
                    <Checkbox
                      {...field}
                      checked={field.value === 'true'}
                      onCheckedChange={(checked) =>
                        setValue(
                          `forms.${formIndex}.parameter.${index}.value`,
                          checked ? 'true' : 'false'
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {item.key === 'defaultPages' && isPathSelected && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.list`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Pages</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="One default page per line"
                      className="resize-none"
                      value={field.value.map((page: any) => page.value).join('\n')}
                      onChange={(e) => handleDefaultPagesChange(e, index)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {item.key === 'queryKey' && isQuerySelected && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Query Key</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter value" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default HttpReferrer;
