import React, { useEffect, useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/src/components/ui/form';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { Input } from '@/src/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/src/components/ui/accordion';
import { fetchAllVariables } from '../../../configurations/@variables/items';
import { Button } from '@/src/components/ui/button';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/src/components/ui/popover';
import { cn } from '@/src/utils/utils';
import { format } from 'date-fns';
import { CalendarIcon, MinusIcon } from '@radix-ui/react-icons';
import { Calendar } from '@/src/components/ui/calendar';
import { eCommValuesArray, fetchAllTags, tagOptions } from '../../../configurations/@tags/items';
import { RadioGroup, RadioGroupItem } from '@/src/components/ui/radio-group';

interface Props {
  formIndex: number;
  table?: any;
}

const timeZoneOptions = [
  { label: 'GMT-12', value: -12 },
  { label: 'GMT-11', value: -11 },
  { label: 'GMT-10', value: -10 },
  { label: 'GMT-9', value: -9 },
  { label: 'GMT-8', value: -8 },
  { label: 'GMT-7', value: -7 },
  { label: 'GMT-6', value: -6 },
  { label: 'GMT-5', value: -5 },
  { label: 'GMT-4', value: -4 },
  { label: 'GMT-3', value: -3 },
  { label: 'GMT-2', value: -2 },
  { label: 'GMT-1', value: -1 },
  { label: 'GMT', value: 0 },
  { label: 'GMT+1', value: 1 },
  { label: 'GMT+2', value: 2 },
  { label: 'GMT+3', value: 3 },
  { label: 'GMT+4', value: 4 },
  { label: 'GMT+5', value: 5 },
  { label: 'GMT+6', value: 6 },
  { label: 'GMT+7', value: 7 },
  { label: 'GMT+8', value: 8 },
  { label: 'GMT+9', value: 9 },
  { label: 'GMT+10', value: 10 },
  { label: 'GMT+11', value: 11 },
  { label: 'GMT+12', value: 12 },
];

const EventTag = ({ formIndex }: Props) => {
  const [cachedConfigTag, setCachedConfigTags] = useState<any[]>([]);
  const [, setCachedEventTags] = useState<any[]>([]);
  const [cachedTag, setCachedTags] = useState<any[]>([]);
  const [userDataTag, setUserDataTag] = useState<any[]>([]);
  const [, setEventSettingVar] = useState<any[]>([]);
  const [eComm, setEComm] = useState(false);
  const [includeSetupTag, setIncludeSetupTag] = useState(false);
  const [includeTeardownTag, setIncludeTeardownTag] = useState(false);
  const [allVar, setAllVar] = useState<any[]>([]);

  const [isChecked, setIsChecked] = useState(false);
  const [isMetaDataChecked, setIsMetaDataChecked] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<string>('');
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<string>('');
  const [timeZone, setTimeZone] = useState<number>(0);
  const [includeUserData, setIncludeUserData] = useState(false);

  const { control, register, setValue } = useFormContext();
  const { fields, append } = useFieldArray({
    control,
    name: `forms.${formIndex}.parameter`,
  });

  const {
    fields: monitoringMetadataFields,
    append: monitoringMetadataAppend,
    remove: monitoringMetadataRemove,
  } = useFieldArray({
    control,
    name: `forms.${formIndex}.monitoringMetadata.map`,
  });

  const {
    fields: consentTypeFields,
    append: consentTypeAppend,
    remove: consentTypeRemove,
  } = useFieldArray({
    control,
    name: `forms.${formIndex}.consentSettings.consentType.list`,
  });

  const {
    fields: userPropertiesFields,
    append: appendUserProperties,
    remove: removeUserProperties,
  } = useFieldArray({
    control,
    name: `forms.${formIndex}.parameter.${fields.findIndex(
      (field: any) => field.key === 'userProperties'
    )}.list`,
  });

  const {
    fields: eventSettingsTableFields,
    append: appendEventSettingsTable,
    remove: removeEventSettingsTable,
  } = useFieldArray({
    control,
    name: `forms.${formIndex}.parameter.${fields.findIndex(
      (field: any) => field.key === 'eventSettingsTable'
    )}.list`,
  });

  const { fields: setupTagFields, append: appendSetupTag } = useFieldArray({
    control,
    name: `forms.${formIndex}.setupTag`,
  });

  const { fields: teardownTagFields, append: appendTeardownTag } = useFieldArray({
    control,
    name: `forms.${formIndex}.teardownTag`,
  });

  const triggerType = useWatch({
    control,
    name: `forms.${formIndex}.type`,
  });
  const consentStatus = useWatch({
    control,
    name: `forms.${formIndex}.consentSettings.consentStatus`,
  });

  const getEcommerceDataFrom = useWatch({
    control,
    name: `forms.${formIndex}.parameter.${fields.findIndex(
      (field) => field.key === 'getEcommerceDataFrom'
    )}.value`,
  });

  useEffect(() => {
    const fetchAllVariableData = async () => {
      try {
        const data = await fetchAllVariables();
        const wrappedConfigData = data
          .filter((trigger) => trigger.type === 'gtes')
          .map((trigger) => ({
            ...trigger,
            name: `${trigger.name}`,
          }));

        const wrappedEventData = data
          .filter((trigger) => trigger.type === 'gtes')
          .map((trigger) => ({
            ...trigger,
            name: `${trigger.name}`,
          }));

        const userData = data
          .filter((tag) => tag.variableType === 'userDefined')
          .map((tag) => ({
            ...tag,
            name: `${tag.name}`,
          }));

        const eventSetting = data
          .filter((tag) => tag.variableType === 'gtes')
          .map((tag) => ({
            ...tag,
            name: `${tag.name}`,
          }));

        setUserDataTag(userData);
        setEventSettingVar(eventSetting);

        setCachedConfigTags(wrappedConfigData);
        setCachedEventTags(wrappedEventData);
        setAllVar(data);
      } catch (error) {
        console.error('Error fetching all triggers:', error);
      }
    };

    fetchAllVariableData();
  }, []);

  useEffect(() => {
    // Fetch data and set cached tags
    const fetchAllTagData = async () => {
      try {
        const data = await fetchAllTags();
        const allTags = data.map((tag) => ({
          ...tag,
          name: `${tag.name}`,
        }));

        setCachedTags(allTags);
      } catch (error) {
        console.error('Error fetching all tags:', error);
      }
    };

    fetchAllTagData();
  }, []);

  useEffect(() => {
    if (fields.length === 0) {
      append({
        type: 'template',
        key: 'measurementIdOverride',
        value: '',
      });
      append({
        type: 'template',
        key: 'eventName',
        value: '',
      });
      append({
        type: 'template',
        key: 'userDataVariable',
        value: '',
      });
      append({
        type: 'template',
        key: 'eventSettingsVariable',
        value: '',
      });
      append({
        type: 'list',
        key: 'eventSettingsTable',
        list: [],
      });
      append({
        type: 'list',
        key: 'userProperties',
        list: [],
      });
      append({
        type: 'boolean',
        key: 'sendEcommerceData',
        value: 'false',
      });
      append({
        type: 'template',
        key: 'getEcommerceDataFrom',
        value: 'dataLayer',
      });
      append({
        type: 'boolean',
        key: 'enhancedUserId',
        value: 'false',
      });
    }
  }, [fields, append]);

  useEffect(() => {
    if (triggerType === 'gaawe') {
      setValue(`forms.${formIndex}.parameter`, [
        {
          type: 'template',
          key: 'measurementIdOverride',
          value: '',
        },
        {
          type: 'template',
          key: 'eventName',
          value: '',
        },
        {
          type: 'template',
          key: 'userDataVariable',
          value: '',
        },
        {
          type: 'template',
          key: 'eventSettingsVariable',
          value: '',
        },
        {
          type: 'list',
          key: 'eventSettingsTable',
          list: [],
        },
        {
          type: 'list',
          key: 'userProperties',
          list: [],
        },
        {
          type: 'boolean',
          key: 'sendEcommerceData',
          value: 'false',
        },
        {
          type: 'template',
          key: 'getEcommerceDataFrom',
          value: 'dataLayer',
        },
        {
          type: 'boolean',
          key: 'enhancedUserId',
          value: 'false',
        },
      ]);
    }
  }, [triggerType, setValue, formIndex]);

  useEffect(() => {
    if (includeSetupTag) {
      appendSetupTag({ tagName: '', stopOnSetupFailure: false });
    }
  }, [includeSetupTag, appendSetupTag]);

  useEffect(() => {
    if (includeTeardownTag) {
      appendTeardownTag({ tagName: '', stopOnSetupFailure: false });
    }
  }, [includeTeardownTag, appendTeardownTag]);

  const handleStartDateChange = (date: Date | undefined) => {
    setSelectedStartDate(date || null);
    if (date && startTime) {
      updateScheduleStartMs(date, startTime);
    }
  };

  const handleStartTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStartTime(event.target.value);
    if (selectedStartDate && event.target.value) {
      updateScheduleStartMs(selectedStartDate, event.target.value);
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setSelectedEndDate(date || null);
    if (date && endTime) {
      updateScheduleEndMs(date, endTime);
    }
  };

  const handleEndTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEndTime(event.target.value);
    if (selectedEndDate && event.target.value) {
      updateScheduleEndMs(selectedEndDate, event.target.value);
    }
  };

  const updateScheduleStartMs = (date: Date, time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const updatedDate = new Date(date);
    updatedDate.setUTCHours(hours - timeZone, minutes, 0, 0); // Adjust for time zone
    setValue(`forms.${formIndex}.scheduleStartMs`, updatedDate.getTime()); // Set as number
  };

  const updateScheduleEndMs = (date: Date, time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const updatedDate = new Date(date);
    updatedDate.setUTCHours(hours - timeZone, minutes, 0, 0); // Adjust for time zone
    setValue(`forms.${formIndex}.scheduleEndMs`, updatedDate.getTime()); // Set as number
  };

  const handleSelectChange = (field: any, value: any) => {
    field.onChange(value);
  };

  return (
    <form className="space-y-4">
      {fields.map((item: any, index: number) => (
        <div key={item.id}>
          {item.key === 'measurementIdOverride' && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormLabel>Tag ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="value"
                      {...register(`forms.${formIndex}.parameter.${index}.value`)}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {item.key === 'eventName' && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormLabel>Event Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="value"
                      {...register(`forms.${formIndex}.parameter.${index}.value`)}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {item.key === 'enhancedUserId' && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormLabel>Include user-provided data from your website</FormLabel>
                  <FormControl>
                    <Checkbox
                      checked={field.value === 'true'}
                      onCheckedChange={(checked) => {
                        field.onChange(checked ? 'true' : 'false');
                        setIncludeUserData(checked === true);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {/* field.value === 'true' */}

          {item.key === 'userDataVariable' && includeUserData && (
            <FormField
              control={control}
              name={`forms.${formIndex}.parameter.${index}.value`}
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormLabel>User Data</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={(value) => field.onChange(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Tag" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="None">None</SelectItem>
                          {userDataTag.map((tag) => (
                            <SelectItem key={tag.id} value={`{{${tag.name}}}`}>
                              {tag.name}
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
        </div>
      ))}

      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>Event Parameters</AccordionTrigger>
          <AccordionContent>
            {fields.map((item: any, index: number) => (
              <div className="grid grid-cols-2 gap-4" key={item.id}>
                {item.key === 'eventSettingsVariable' && (
                  <FormField
                    control={control}
                    name={`forms.${formIndex}.parameter.${index}.value`}
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormLabel>Event Settings Variable</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={(value) => handleSelectChange(field, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select Selection Method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectItem value="None">None</SelectItem>
                                {cachedConfigTag.map((tag) => (
                                  <SelectItem key={tag.id} value={`{{${tag.name}}}`}>
                                    {tag.name}
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

                {item.key === 'eventSettingsTable' && (
                  <div className="pt-4">
                    <div className="space-y-4">
                      <div>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <FormLabel>Event Parameter</FormLabel>
                          <FormLabel>Event Value</FormLabel>
                        </div>
                        <div className="space-y-4">
                          {eventSettingsTableFields.map((eventItem, eventIndex) => (
                            <div key={eventItem.id} className="grid grid-cols-3 gap-4 items-center">
                              {eventItem.map.map((subItem, subIndex) => (
                                <React.Fragment key={subIndex}>
                                  {subItem.key === 'parameter' && (
                                    <FormField
                                      control={control}
                                      name={`forms.${formIndex}.parameter.${fields.findIndex(
                                        (field) => field.key === 'eventSettingsTable'
                                      )}.list.${eventIndex}.map.${subIndex}.value`}
                                      render={({ field }) => (
                                        <FormControl>
                                          <Input {...field} placeholder="Parameter" />
                                        </FormControl>
                                      )}
                                    />
                                  )}
                                  {subItem.key === 'parameterValue' && (
                                    <FormField
                                      control={control}
                                      name={`forms.${formIndex}.parameter.${fields.findIndex(
                                        (field) => field.key === 'eventSettingsTable'
                                      )}.list.${eventIndex}.map.${subIndex}.value`}
                                      render={({ field }) => (
                                        <FormControl>
                                          <Input {...field} placeholder="Value" />
                                        </FormControl>
                                      )}
                                    />
                                  )}
                                </React.Fragment>
                              ))}
                              <Button
                                type="button"
                                onClick={() => removeEventSettingsTable(eventIndex)}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      className="mt-5"
                      onClick={() =>
                        appendEventSettingsTable({
                          type: 'map',
                          map: [
                            { type: 'template', key: 'parameter', value: '' },
                            { type: 'template', key: 'parameterValue', value: '' },
                          ],
                        })
                      }
                    >
                      Add Row
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-2">
          <AccordionTrigger>User Properties</AccordionTrigger>
          <AccordionContent>
            {fields.map((item: any) => (
              <div className="grid grid-cols-2 gap-4" key={item.id}>
                {item.key === 'userProperties' && (
                  <div className="pt-4">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <FormLabel htmlFor={`user-properties-table-${formIndex}`}>
                        Property Name
                      </FormLabel>
                      <FormLabel htmlFor={`user-properties-table-${formIndex}`}>Value</FormLabel>
                    </div>
                    <div className="space-y-4">
                      {userPropertiesFields.map((eventItem, eventIndex) => (
                        <div key={eventItem.id} className="grid grid-cols-3 gap-4 items-center">
                          {eventItem.map.map((subItem: any, subIndex: number) => (
                            <React.Fragment key={subIndex}>
                              {subItem.key === 'name' && (
                                <FormField
                                  control={control}
                                  name={`forms.${formIndex}.parameter.${fields.findIndex(
                                    (field) => field.key === 'userProperties'
                                  )}.list.${eventIndex}.map.${subIndex}.value`}
                                  render={({ field }) => (
                                    <FormControl>
                                      <Input
                                        {...register(
                                          `forms.${formIndex}.parameter.${fields.findIndex(
                                            (field) => field.key === 'userProperties'
                                          )}.list.${eventIndex}.map.${subIndex}.value`
                                        )}
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="Property Name"
                                      />
                                    </FormControl>
                                  )}
                                />
                              )}
                              {subItem.key === 'value' && (
                                <FormField
                                  control={control}
                                  name={`forms.${formIndex}.parameter.${fields.findIndex(
                                    (field) => field.key === 'userProperties'
                                  )}.list.${eventIndex}.map.${subIndex}.value`}
                                  render={({ field }) => (
                                    <FormControl>
                                      <Input
                                        {...register(
                                          `forms.${formIndex}.parameter.${fields.findIndex(
                                            (field) => field.key === 'userProperties'
                                          )}.list.${eventIndex}.map.${subIndex}.value`
                                        )}
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="Value"
                                      />
                                    </FormControl>
                                  )}
                                />
                              )}
                            </React.Fragment>
                          ))}
                          <Button type="button" onClick={() => removeUserProperties(eventIndex)}>
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      className="mt-5"
                      onClick={() =>
                        appendUserProperties({
                          type: 'map',
                          map: [
                            { type: 'template', key: 'name', value: '' },
                            { type: 'template', key: 'value', value: '' },
                          ],
                        })
                      }
                    >
                      Add Row
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-3">
          <AccordionTrigger>More Settings</AccordionTrigger>
          <AccordionContent>
            <div>
              {fields.map((item: any, index: number) => (
                <React.Fragment key={index}>
                  {item.key === 'sendEcommerceData' && (
                    <FormField
                      control={control}
                      name={`forms.${formIndex}.parameter.${index}.value`}
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value === 'true'}
                              onCheckedChange={(checked) => {
                                field.onChange(checked ? 'true' : 'false');
                                setEComm(checked === true);
                              }}
                            />
                          </FormControl>
                          <FormLabel>Send Ecommerce Data</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {item.key === 'getEcommerceDataFrom' && eComm && (
                    <FormField
                      control={control}
                      name={`forms.${formIndex}.parameter.${index}.value`}
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormLabel>Data source</FormLabel>
                          <FormControl>
                            <Select
                              value={field.value}
                              onValueChange={(value) => field.onChange(value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select data source" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {eCommValuesArray.map((tag) => (
                                    <SelectItem key={tag.type} value={tag.type}>
                                      {tag.name}
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
                </React.Fragment>
              ))}
              {getEcommerceDataFrom === 'customObject' && (
                <FormField
                  control={control}
                  name={`forms.${formIndex}.parameter.${fields.findIndex(
                    (field) => field.key === 'ecommerceMacroData'
                  )}.value`}
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormLabel>Ecommerce Object</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => field.onChange(value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select data source" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {allVar.map((tag) => (
                                <SelectItem key={tag.type} value={`{{${tag.name}}}`}>
                                  {tag.name}
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
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-4">
          <AccordionTrigger>Advanced settings</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={control}
                name={`forms.${formIndex}.priority.value`}
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormLabel>Tag firing priority</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="value"
                        {...register(`forms.${formIndex}.priority.value`)}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name={`forms.${formIndex}.waitForTags.value`}
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value === true}
                        onCheckedChange={(checked) => {
                          field.onChange(checked ? true : false);
                          setIsChecked(checked == true); // Update state
                        }}
                      />
                    </FormControl>
                    <FormLabel>Enable custom tag firing schedule</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isChecked && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormItem className="flex items-center space-x-2">
                    <FormLabel>Time Zone</FormLabel>
                    <Select
                      value={timeZone.toString()}
                      onValueChange={(value) => setTimeZone(Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Time Zone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {timeZoneOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FormItem>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={control}
                    name={`forms.${formIndex}.scheduleStartMs`}
                    render={() => (
                      <FormItem className="flex items-center space-x-2">
                        <FormLabel>Start Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={'outline'}
                                className={cn(
                                  'pl-3 text-left font-normal',
                                  !selectedStartDate && 'text-muted-foreground'
                                )}
                              >
                                {selectedStartDate ? (
                                  format(selectedStartDate, 'PPP')
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={selectedStartDate}
                              onSelect={handleStartDateChange}
                              disabled={(date) =>
                                date > new Date() || date < new Date('1900-01-01')
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <Input
                          type="time"
                          placeholder="Select Time"
                          value={startTime}
                          onChange={handleStartTimeChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name={`forms.${formIndex}.scheduleEndMs`}
                    render={() => (
                      <FormItem className="flex items-center space-x-2">
                        <FormLabel>End Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={'outline'}
                                className={cn(
                                  'pl-3 text-left font-normal',
                                  !selectedEndDate && 'text-muted-foreground'
                                )}
                              >
                                {selectedEndDate ? (
                                  format(selectedEndDate, 'PPP')
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={selectedEndDate}
                              onSelect={handleEndDateChange}
                              disabled={(date) =>
                                date > new Date() || date < new Date('1900-01-01')
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <Input
                          type="time"
                          placeholder="Select Time"
                          value={endTime}
                          onChange={handleEndTimeChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}
            <FormField
              control={control}
              name={`forms.${formIndex}.liveOnly`}
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value === true}
                      onCheckedChange={(checked) => {
                        field.onChange(checked ? true : false);
                      }}
                    />
                  </FormControl>
                  <FormLabel>Only fire this tag in published containers.</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`forms.${formIndex}.tagFiringOption`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tag firing options</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={(value) => handleSelectChange(field, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a variable type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {tagOptions.map((opt) => (
                            <SelectItem key={opt.type} value={opt.type}>
                              {opt.name}
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

            <div className="mx-10">
              <Accordion type="single" collapsible>
                <AccordionItem value="item-1">
                  <AccordionTrigger>Tag Sequencing</AccordionTrigger>
                  <AccordionContent>
                    <FormField
                      control={control}
                      name={`forms.${formIndex}.includeSetupTag`}
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value === true}
                              onCheckedChange={(checked) => {
                                field.onChange(checked ? true : false);
                                setIncludeSetupTag(checked === true); // Update state
                              }}
                            />
                          </FormControl>
                          <FormLabel>Include Setup Tag</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {includeSetupTag &&
                      setupTagFields.map((item, index) => (
                        <React.Fragment key={item.id}>
                          <FormField
                            control={control}
                            name={`forms.${formIndex}.setupTag.${index}.tagName`}
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormLabel>Setup Tag</FormLabel>
                                <FormControl>
                                  <Select
                                    value={field.value}
                                    onValueChange={(value) => field.onChange(value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select Tag" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectGroup>
                                        <SelectItem value="None">None</SelectItem>
                                        {cachedTag.map((tag) => (
                                          <SelectItem key={tag.id} value={tag.name}>
                                            {tag.name}
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
                          <FormField
                            control={control}
                            name={`forms.${formIndex}.setupTag.${index}.stopOnSetupFailure`}
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value === true}
                                    onCheckedChange={(checked) =>
                                      field.onChange(checked ? true : false)
                                    }
                                  />
                                </FormControl>
                                <FormLabel>
                                  Do not fire new tag if setup tag fails or is paused
                                </FormLabel>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </React.Fragment>
                      ))}

                    <FormField
                      control={control}
                      name={`forms.${formIndex}.includeTeardownTag`}
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value === true}
                              onCheckedChange={(checked) => {
                                field.onChange(checked ? true : false);
                                setIncludeTeardownTag(checked === true);
                              }}
                            />
                          </FormControl>
                          <FormLabel>Fire a tag after new tag fires</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {includeTeardownTag &&
                      teardownTagFields.map((item, index) => (
                        <React.Fragment key={item.id}>
                          <FormField
                            control={control}
                            name={`forms.${formIndex}.teardownTag.${index}.tagName`}
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormLabel>Cleanup Tag</FormLabel>
                                <FormControl>
                                  <Select
                                    value={field.value}
                                    onValueChange={(value) => field.onChange(value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select Tag" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectGroup>
                                        <SelectItem value="None">None</SelectItem>
                                        {cachedTag.map((tag) => (
                                          <SelectItem key={tag.id} value={tag.name}>
                                            {tag.name}
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
                          <FormField
                            control={control}
                            name={`forms.${formIndex}.teardownTag.${index}.stopTeardownOnFailure`}
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value === true}
                                    onCheckedChange={(checked) =>
                                      field.onChange(checked ? true : false)
                                    }
                                  />
                                </FormControl>
                                <FormLabel>
                                  Do not fire cleanup tag if new tag fails or is paused
                                </FormLabel>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </React.Fragment>
                      ))}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                  <AccordionTrigger>Additional Tag Metadata</AccordionTrigger>
                  <AccordionContent>
                    <FormField
                      control={control}
                      name={`forms.${formIndex}.metaDataTagName`}
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value === true}
                              onCheckedChange={(checked) => {
                                field.onChange(checked ? true : false);
                                setIsMetaDataChecked(checked == true); // Update state
                              }}
                            />
                          </FormControl>
                          <FormLabel>Include tag name</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {isMetaDataChecked && (
                      <>
                        <FormField
                          control={control}
                          name={`forms.${formIndex}.monitoringMetadataTagNameKey`}
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormLabel>Key for tag name</FormLabel>
                              <FormControl>
                                <Input
                                  {...register(`forms.${formIndex}.monitoringMetadataTagNameKey`)}
                                  value={field.value}
                                  onChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    {monitoringMetadataFields.map((item, index) => (
                      <div key={item.id} className="flex items-center space-x-4">
                        <FormField
                          control={control}
                          name={`forms.${formIndex}.monitoringMetadata.map.${index}.key`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>Key</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Input" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={control}
                          name={`forms.${formIndex}.monitoringMetadata.map.${index}.value`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>Value</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Value" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          className="mt-6"
                          type="button"
                          onClick={() => monitoringMetadataRemove(index)}
                        >
                          <MinusIcon />
                        </Button>
                      </div>
                    ))}

                    <Button
                      type="button"
                      className="mt-5"
                      onClick={() =>
                        monitoringMetadataAppend({
                          type: 'template',
                          key: '',
                          value: '',
                        })
                      }
                    >
                      + Add Row
                    </Button>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                  <AccordionTrigger>Consent Settings</AccordionTrigger>
                  <AccordionContent>
                    <FormField
                      control={control}
                      name={`forms.${formIndex}.consentSettings.consentStatus`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Consent Status</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col space-y-1"
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="notSet" />
                                </FormControl>
                                <FormLabel className="font-normal">Not Set</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="notNeeded" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  No additional consent required
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="needed" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  Require additional consent for tag to fire
                                </FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {consentStatus === 'needed' &&
                      consentTypeFields.map((item: any, index: number) => (
                        <div key={item.id} className="flex items-center space-x-4">
                          <FormField
                            control={control}
                            name={`forms.${formIndex}.consentSettings.consentType.list.${index}.value`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel>Element ID</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="value" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button type="button" onClick={() => consentTypeRemove(index)}>
                            Remove
                          </Button>
                        </div>
                      ))}

                    {consentStatus === 'needed' && (
                      <Button
                        type="button"
                        onClick={() =>
                          consentTypeAppend({
                            type: 'template',
                            value: '',
                          })
                        }
                      >
                        Add
                      </Button>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </form>
  );
};

export default EventTag;
