import React, { useEffect } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/src/components/ui/form';
import CodeEditor from '@uiw/react-textarea-code-editor';

interface Props {
  formIndex: number;
  type: string;
  table?: any;
}

const CustomJS = ({ formIndex }: Props) => {
  const { control, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `forms.${formIndex}.parameter`,
  });

  const variableType = useWatch({
    control,
    name: `forms.${formIndex}.type`,
  });

  // Append default fields if fields are empty
  useEffect(() => {
    if (fields.length === 0) {
      append({
        type: 'template',
        key: 'javascript',
        value: '',
      });
    } else if (fields.length > 1) {
      remove(1); // Ensure only one field is appended
    }
  }, [fields, append, remove]);

  // Watch for changes in variable type and update parameters accordingly
  useEffect(() => {
    if (variableType === 'jsm') {
      setValue(`forms.${formIndex}.parameter`, [
        {
          type: 'template',
          key: 'javascript',
          value: '',
        },
      ]);
    }
  }, [variableType, setValue, formIndex]);

  return (
    <div>
      {fields.map((item: any, index: number) => (
        <div className="py-3" key={item.id}>
          {item.key === 'javascript' && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom JavaScript</FormLabel>
                  <FormControl>
                    <CodeEditor
                      value={field.value}
                      language="js"
                      placeholder="Please enter your JavaScript code."
                      onChange={(evn) =>
                        setValue(`forms.${formIndex}.parameter.${index}.value`, evn.target.value)
                      }
                      padding={15}
                      style={{
                        fontSize: '14px',
                        backgroundColor: '#1e1e1e',
                        color: '#d4d4d4',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        width: '100%',
                        minHeight: '200px',
                        fontFamily:
                          'ui-monospace, SFMono-Regular, SF Mono, Consolas, Liberation Mono, Menlo, monospace',
                        outline: 'none',
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                      }}
                    />
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

export default CustomJS;
