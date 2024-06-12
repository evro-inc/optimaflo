'use client';
import { Button } from '@/src/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/src/components/ui/card';
import {
  Drawer,
  DrawerTrigger,
  DrawerOverlay,
  DrawerPortal,
  DrawerContent,
} from '@/src/components/ui/drawer';
import { Input } from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import { Label } from '@radix-ui/react-label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@radix-ui/react-tabs';
import clsx from 'clsx';
import { useState } from 'react';
import { DataTable } from './table/table';
import { columns } from './table/columns';
import { RadioGroup, RadioGroupItem } from '@/src/components/ui/radio-group';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/src/components/ui/form';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormSchema } from '@/src/lib/schemas/gtm/versions';
import { z } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { setLoading } from '@/redux/formSlice';
import { publishGTM } from '@/src/lib/fetch/dashboard/actions/gtm/versions';
import { FeatureResponse } from '@/src/types/types';
import { useRouter } from 'next/navigation';
import { setErrorDetails, setIsLimitReached, setNotFoundError } from '@/src/redux/tableSlice';
import { RootState } from '@/src/redux/store';
import { createGTMVersion } from '@/src/lib/fetch/dashboard/actions/gtm/workspaces';
import { UpdateEnvs } from '@/src/lib/fetch/dashboard/actions/gtm/envs';
import { Checkbox } from '@/src/components/ui/checkbox';

type Forms = z.infer<typeof FormSchema>;


function getUniqueAccountAndContainerInfo(changes) {
  const accountContainerSet = new Set();

  changes.forEach(change => {
    if (change.accountId && change.containerId && change.accountName && change.containerName && change.workspaceId) {
      const accountContainerInfo = JSON.stringify({
        accountId: change.accountId,
        containerId: change.containerId,
        accountName: change.accountName,
        containerName: change.containerName,
        workspaceId: change.workspaceId
      });
      accountContainerSet.add(accountContainerInfo);
    }
  });

  return Array.from(accountContainerSet).map(info => JSON.parse(info));
}




function PublishGTM({ changes, envs }: { changes: any; envs: any }) {
  const dispatch = useDispatch();
  const router = useRouter();

  const loading = useSelector((state: RootState) => state.form.loading);
  const [snap, setSnap] = useState<number | string | null>('250px');


  const uniqueAccountContainerInfo = getUniqueAccountAndContainerInfo(changes);

  const formDataDefaults = {
    path: '',
    accountId: '',
    containerId: '',
    containerVersionId: '',
    environementId: '',
    name: '',
    deleted: false,
    description: '',
    container: {
      path: '',
      accountId: '',
      containerId: '',
      name: '',
      description: '',
      fingerprint: ''
    },
    tag: [],
    trigger: [],
    variable: [],
    folder: [],
    builtInVariable: [],
    fingerprint: '',
    tagManagerUrl: '',
    zone: [],
    customTemplate: [],
    client: [],
    gtagConfig: [],
    transformation: [],
    createVersion: {
      entityId: '',
      name: '',
      notes: ''
    }
  };


  const form = useForm<Forms>({
    defaultValues: {
      forms: [formDataDefaults],
    },
    resolver: zodResolver(FormSchema),
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: 'forms',
  });


  console.log("form state error", form.formState.errors);


  const processForm: SubmitHandler<Forms> = async (data) => {
    const { forms } = data;
    dispatch(setLoading(true)); // Set loading to true using Redux action

    console.log('data', forms);



    toast('Publishing GTM...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    /*     const uniqueKeyEvents = new Set(forms.map((form) => form.name));
        for (const form of forms) {
          const identifier = `${form.accountProperty}-${form.eventName}`;
    
          if (uniqueKeyEvents.has(identifier)) {
            toast.error(`Duplicate key event found for ${form.accountProperty} - ${form.eventName}`, {
              action: {
                label: 'Close',
                onClick: () => toast.dismiss(),
              },
            });
            dispatch(setLoading(false));
            return;
          }
          uniqueKeyEvents.add(identifier);
        } */

    try {
      let res: FeatureResponse = { success: false, results: [] };
      let resUpdateEnv: FeatureResponse = { success: false, results: [] };

      // Extract and transform the createVersion data
      const createVersionData = forms.flatMap(form => {
        const { createVersion } = form;
        const entityIdPairs = createVersion.entityId || [];

        return entityIdPairs.map(id => {
          const [accountId, containerId, workspaceId] = id.split('-');
          return {
            accountId,
            containerId,
            name: createVersion.name,
            description: createVersion.notes,
            workspaceId: workspaceId,
          };
        });
      });



      const resCreateVersion = (await createGTMVersion({ forms: createVersionData })) as FeatureResponse;

      if (resCreateVersion.success) {
        const publishData = forms.flatMap(form => {
          const { accountId, containerId, environmentId, createVersion } = form;

          return {
            accountId,
            containerId,
            containerVersionId: resCreateVersion.results[0].response.containerVersion.containerVersionId,
            environmentId: environmentId,
            name: createVersion.name,
            description: createVersion.notes,
          };
        }
        );

        res = await publishGTM({ forms: publishData }) as FeatureResponse;

      }


      if (res.success) {
        const envData = forms.flatMap(form => {
          const { accountId, containerId, environmentId, createVersion } = form;

          return {
            accountId,
            containerId,
            environmentId: environmentId.split('-')[1],
            containerVersionId: resCreateVersion.results[0].response.containerVersion.containerVersionId,
            workspaceId: environmentId.split('-')[3],
            name: createVersion.name,
            description: createVersion.notes,
          };
        }
        );

        console.log('envData', envData);


        resUpdateEnv = (await UpdateEnvs({ forms: envData })) as FeatureResponse;
      }

      console.log('resUpdateEnv', resUpdateEnv);




      console.log('resCreateVersion', resCreateVersion.results);
      console.log('resUpdateEnv', resUpdateEnv);
      console.log('res', res);


      if (res.success) {
        res.results.forEach((result) => {
          if (result.success) {
            toast.success(
              `Key Event ${result.name} created successfully. The table will update shortly.`,
              {
                action: {
                  label: 'Close',
                  onClick: () => toast.dismiss(),
                },
              }
            );
          }
        });

        router.push('/dashboard/gtm/configurations');
      } else {
        if (res.notFoundError) {
          res.results.forEach((result) => {
            if (result.notFound) {
              toast.error(
                `Unable to create key event ${result.name}. Please check your access permissions. Any other key events created were successful.`,
                {
                  action: {
                    label: 'Close',
                    onClick: () => toast.dismiss(),
                  },
                }
              );
            }
          });

          dispatch(setErrorDetails(res.results)); // Assuming results contain the error details
          dispatch(setNotFoundError(true)); // Dispatch the not found error action
        }

        if (res.limitReached) {
          toast.error(
            `Unable to create key event(s). You have hit your current limit for this feature.`,
            {
              action: {
                label: 'Close',
                onClick: () => toast.dismiss(),
              },
            }
          );

          dispatch(setIsLimitReached(true));
        }
        if (res.errors) {
          res.errors.forEach((error) => {
            toast.error(`Unable to create key event. ${error}`, {
              action: {
                label: 'Close',
                onClick: () => toast.dismiss(),
              },
            });
          });
        }
        form.reset({
          forms: [formDataDefaults],
        });
      }

      // Reset the forms here, regardless of success or limit reached
      form.reset({
        forms: [formDataDefaults],
      });
    } catch (error) {
      toast.error('An unexpected error occurred.', {
        action: {
          label: 'Close',
          onClick: () => toast.dismiss(),
        },
      });
      return { success: false };
    } finally {
      dispatch(setLoading(false)); // Set loading to false
    }
  };

  const handleCheckboxChange = (checked, item, index) => {
    const entityId = `${item.accountId}-${item.containerId}-${item.workspaceId}`;
    const accountId = item.accountId;
    const containerId = item.containerId;

    const forms = form.watch('forms');
    const fieldValue = Array.isArray(forms[index].createVersion.entityId)
      ? forms[index].createVersion.entityId
      : [];

    const newEntityId = checked
      ? [...fieldValue, entityId]
      : fieldValue.filter((value) => value !== entityId);

    // Update both accountId and createVersion.entityId
    form.setValue(`forms.${index}.accountId`, accountId);
    form.setValue(`forms.${index}.containerId`, containerId);
    form.setValue(`forms.${index}.createVersion.entityId`, newEntityId);
  };

  return (
    <Drawer snapPoints={[0.4, 1]} activeSnapPoint={snap} setActiveSnapPoint={setSnap}>
      <DrawerTrigger asChild>
        <Button variant="outline" type="button">
          Submit
        </Button>
      </DrawerTrigger>
      <DrawerOverlay className="fixed inset-0 bg-black/40" />
      <DrawerPortal>
        <DrawerContent className="fixed flex flex-col bg-white border border-gray-200 border-b-none rounded-t-[10px] bottom-0 left-0 right-0 h-full max-h-[97%] mx-[-1px]">
          <div
            className={clsx('grid gap-6 p-6 mx-auto w-full pt-5', {
              'overflow-y-auto': snap === 1,
              'overflow-hidden': snap !== 1,
            })}
          >
            {/*  <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Submit Changes</span>
              <Button type="submit">{loading ? 'Submitting...' : 'Submit'}</Button>
            </div> */}

            {fields.map((field, index) => {

              // console.log('FIELD', field);
              return (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(processForm)}
                    className="space-y-6"
                  >

                    <Card>
                      <CardHeader className="grid grid-cols-2 items-center">
                        <CardTitle className="col-start-1 col-end-2">Submission Configuration</CardTitle>
                        <Button type="submit" className="col-start-2 col-end-3 justify-self-end">{loading ? 'Submitting...' : 'Submit'}</Button>
                      </CardHeader>



                      <Tabs defaultValue="publish">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="publish">Pubish and Create Version</TabsTrigger>
                          <TabsTrigger value="version">Create Version</TabsTrigger>
                        </TabsList>
                        <TabsContent value="publish">
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                {/* <Input id="versionName" defaultValue="GTM Change" /> */}

                                <FormField
                                  control={form.control}
                                  name={`forms.${index}.createVersion.name`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Version Name</FormLabel>
                                      <FormDescription>The version name will be applied to all containers you are trying to publish.</FormDescription>
                                      <FormControl>
                                        <Input
                                          placeholder="This name will be applied on all containers you are currently trying to publish."
                                          {...form.register(`forms.${index}.createVersion.name`)}
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />


                              </div>
                            </div>
                            <div className="space-y-2">


                              <FormField
                                control={form.control}
                                name={`forms.${index}.createVersion.notes`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Version Description</FormLabel>
                                    <FormDescription>The version description will be applied to all containers you are trying to publish.</FormDescription>
                                    <FormControl>
                                      {/* <Input
                                      placeholder="Name of the event name"
                                      {...form.register(`createVersion.notes`)}
                                      {...field}
                                    /> */}
                                      <Textarea
                                        id="description" rows={3}
                                        defaultValue="Pushing GTM changes."
                                        {...form.register(`forms.${index}.createVersion.notes`)}
                                        {...field}
                                      />

                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className='flex justify-evenly'>

                              <div className="space-y-2">


                                <FormField
                                  control={form.control}
                                  name={`forms.${index}.environmentId`}
                                  render={({ field }) => (
                                    <FormItem className="space-y-3">
                                      <FormLabel>Publish to Environment</FormLabel>
                                      <FormControl>
                                        <RadioGroup
                                          onValueChange={field.onChange}
                                          defaultValue={field.value}
                                          className="flex flex-col space-y-1"
                                        >
                                          {envs.map((env: any) => (
                                            <FormItem key={env.id} className="flex items-center space-x-3 space-y-0">
                                              <FormControl>
                                                <RadioGroupItem value={`${env.type}-${env.environmentId}`} />
                                              </FormControl>
                                              <FormLabel className="font-normal">{env.name}</FormLabel>
                                            </FormItem>
                                          ))}
                                        </RadioGroup>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                              </div>


                              <FormField
                                control={form.control}
                                name={`forms.${index}.createVersion.entityId`}
                                render={() => (
                                  <FormItem>
                                    <div className="mb-4">
                                      <FormLabel className="text-base">Choose GTM Entity</FormLabel>
                                      <FormDescription>
                                        Select the GTM entities you want to publish the changes to.
                                      </FormDescription>
                                    </div>
                                    {uniqueAccountContainerInfo.map((item) => (
                                      <FormField
                                        key={`${item.accountId}-${item.containerId}`}  // Ensure a unique key
                                        control={form.control}
                                        name={`forms.${index}.createVersion.entityId`}
                                        render={({ field }) => {
                                          // Ensure field.value is an array
                                          const fieldValue = Array.isArray(field.value) ? field.value : [];
                                          return (
                                            <FormItem
                                              key={`${item.accountId}-${item.containerId}`}
                                              className="flex flex-row items-start space-x-3 space-y-0"
                                            >
                                              <FormControl>
                                                <Checkbox
                                                  checked={fieldValue.includes(
                                                    `${item.accountId}-${item.containerId}-${item.workspaceId}`
                                                  )}
                                                  onCheckedChange={(checked) => handleCheckboxChange(checked, item, index)}
                                                />
                                              </FormControl>
                                              <FormLabel className="font-normal">
                                                {item.accountName} - {item.containerName}
                                              </FormLabel>
                                            </FormItem>
                                          );
                                        }}
                                      />
                                    ))}

                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                            </div>

                          </CardContent>
                        </TabsContent>
                        <TabsContent value="version">
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="versionName">Version Name</Label>
                                <Input id="versionName" defaultValue="GTM Change" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="description">Version Description</Label>
                              <Textarea id="description" rows={3} defaultValue="Pushing GTM changes." />
                            </div>
                          </CardContent>
                        </TabsContent>
                      </Tabs>
                    </Card>

                  </form>
                </Form>

              )
            })}




            <Card>
              <CardHeader>
                <CardTitle>Workspace Changes</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable columns={columns} data={changes} />
              </CardContent>
            </Card>
          </div>
        </DrawerContent>
      </DrawerPortal>
    </Drawer>
  );
}

export default PublishGTM;
