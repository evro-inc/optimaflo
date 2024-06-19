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
import { Dispatch, useState } from 'react';
import { DataTable } from './table/table';
import { columns } from './table/columns';
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
import { getGtmEnv, UpdateEnvs } from '@/src/lib/fetch/dashboard/actions/gtm/envs';
import { Checkbox } from '@/src/components/ui/checkbox';
import { revalidate } from '@/src/utils/server';
import { useUser } from '@clerk/nextjs';
import { A } from '@upstash/redis/zmscore-b6b93f14';

type Forms = z.infer<typeof FormSchema>;

function getUniqueAccountAndContainerInfo(changes) {
  const accountContainerSet = new Set();

  changes.forEach((change) => {
    if (
      change.accountId &&
      change.containerId &&
      change.accountName &&
      change.containerName &&
      change.workspaceId
    ) {
      const accountContainerInfo = JSON.stringify({
        accountId: change.accountId,
        containerId: change.containerId,
        accountName: change.accountName,
        containerName: change.containerName,
        workspaceId: change.workspaceId,
      });
      accountContainerSet.add(accountContainerInfo);
    }
  });

  return Array.from(accountContainerSet).map((info) => JSON.parse(info));
}
function mergeUniqueInfo(accountContainerInfo, envs) {
  return accountContainerInfo.map((info) => {
    const relatedEnvs = envs
      .filter((env) => env.accountId === info.accountId && env.containerId === info.containerId)
      .map((env) => ({
        type: env.type,
        name: env.name,
        environmentId: env.environmentId,
      }));

    return {
      ...info,
      environments: relatedEnvs,
    };
  });
}

function PublishGTM({ changes, envs }: { changes: any; envs: any }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id as string;

  const loading = useSelector((state: RootState) => state.form.loading);
  const [snap, setSnap] = useState<number | string | null>('250px');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('publish');

  console.log('envs', envs);
  console.log('changes', changes);

  const uniqueEnvs: {
    type: string;
    name: string;
    accountId: string;
    containerId: string;
    environmentId: string;
  }[] = [];
  const seenTypes = new Set<string>();

  envs.forEach((env) => {
    const typeNameKey = `${env.environmentId}-${env.type}-${env.name}-${env.accountId}-${env.containerId}`;
    if (env.type !== 'latest') {
      seenTypes.add(typeNameKey);
      uniqueEnvs.push({
        type: env.type,
        name: env.name,
        accountId: env.accountId,
        containerId: env.containerId,
        environmentId: env.environmentId,
      });
    }
  });

  const uniqueAccountContainerInfo = getUniqueAccountAndContainerInfo(changes);

  console.log('A uniqueAccountContainerInfo', uniqueAccountContainerInfo);
  console.log('A uniqueEnvs', uniqueEnvs);

  const combinedInfo = mergeUniqueInfo(uniqueAccountContainerInfo, uniqueEnvs);
  console.log('Combined Info', combinedInfo);

  const formDataDefaults = {
    path: '',
    accountId: '',
    containerId: '',
    containerVersionId: '',
    environmentId: '',
    name: '',
    deleted: false,
    description: '',
    container: {
      path: '',
      accountId: '',
      containerId: '',
      name: '',
      description: '',
      fingerprint: '',
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
      notes: '',
    },
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

  // Utility function to show toast notifications
  const showToast = (message: string, isError: boolean = false) => {
    toast(message, {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });
  };

  // Function to extract and transform createVersion data
  const extractCreateVersionData = (forms: Forms[]) => {
    const createVersionData = forms.flatMap((form) => {
      const { createVersion } = form;
      const entityIdPairs = createVersion.entityId || [];

      return entityIdPairs.map((id) => {
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

    return forms.flatMap((form) => {
      const { createVersion } = form;
      const entityIdPairs = createVersion.entityId || [];

      return entityIdPairs.map((id) => {
        const [accountId, containerId, workspaceId] = id.split('-');
        return {
          accountId,
          containerId,
          name: createVersion.name,
          description: createVersion.notes,
          workspaceId,
        };
      });
    });
  };

  // Function to extract publish data
  const extractPublishData = (forms: Forms[], versionPaths: string[]) => {
    console.log('extractPublishData forms', forms);
    console.log('containerVersionId', versionPaths);

    const dataForm = forms.flatMap((form) => {
      console.log('inside form', form);

      return form.createVersion.entityId.map((entityId) => {
        const [accountId, containerId, workspaceId, environmentId, environmentType] = entityId.split('-');

        // Find the corresponding versionPath
        const versionPath = versionPaths.find(vp => vp.includes(`accounts/${accountId}/containers/${containerId}`));
        const containerVersionId = versionPath ? versionPath.split('/').pop() : '';

        const data = {
          accountId,
          containerId,
          containerVersionId,
          environmentId,
          name: form.createVersion.name,
          description: form.createVersion.notes,
        };

        console.log('data in', data);

        return data;
      });
    });

    return dataForm;
  };




  // Function to extract environment update data
  const extractEnvUpdateData = (forms, containerVersionId) => {
    return forms.flatMap((form) => {
      const { accountId, containerId, environmentId, createVersion } = form;

      return environmentId.map((envId) => {
        const [accId, contId, type, envIdPart] = envId.split('-');
        return {
          accountId: accId,
          containerId: contId,
          environmentId: envIdPart,
          containerVersionId,
          workspaceId: form.workspaceId, // ensure workspaceId is correctly set if needed
          name: createVersion.name,
          description: createVersion.notes,
        };
      });
    });
  };

  // Function to handle response success
  const handleResponseSuccess = async (
    res: FeatureResponse,
    userId: string,
    setIsDrawerOpen: (isOpen: boolean) => void
  ) => {
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

    const keys = [
      `gtm:accounts:userId:${userId}`,
      `gtm:containers:userId:${userId}`,
      `gtm:workspaces:userId:${userId}`,
      `gtm:builtInVariables:userId:${userId}`,
    ];
    await revalidate(keys, '/dashboard/gtm/configurations', userId);

    router.push('/dashboard/gtm/configurations');
    setIsDrawerOpen(false);
  };

  // Function to handle response errors
  const handleResponseErrors = (res: FeatureResponse, dispatch: Dispatch<any>) => {
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

      dispatch(setErrorDetails(res.results));
      dispatch(setNotFoundError(true));
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
  };

  // Main form processing function
  const processForm: SubmitHandler<Forms> = async (data) => {
    const { forms } = data;

    dispatch(setLoading(true)); // Set loading to true using Redux action
    console.log('forms process: ', forms);

    if (activeTab === 'publish') {
      showToast('Publishing GTM...', false);

      try {
        const createVersionData = extractCreateVersionData(forms);

        const resCreateVersion = (await createGTMVersion({
          forms: createVersionData,
        })) as FeatureResponse;

        console.log('resCreateVersion', resCreateVersion);

        if (resCreateVersion.success) {
          const versionPath =
            resCreateVersion.results.map((result) => result.response.containerVersion.path) || '';
          const environments = forms.flatMap((form) => form?.environmentId?.split(','));

          console.log('versionId', versionPath);


          console.log('environments', environments);

          // Separate live and non-live environments
          const liveEnvironments = environments.filter(
            (env) => env && env.split('-')[1].toLowerCase() === 'live'
          );
          const nonLiveEnvironments = environments.filter(
            (env) => env && env.split('-')[1].toLowerCase() !== 'live'
          );

          console.log('liveEnvironments', liveEnvironments);
          console.log('nonLiveEnvironments', nonLiveEnvironments);

          if (liveEnvironments.length > 0) {
            const publishData = extractPublishData(forms, versionPath);
            console.log('publishData', publishData);

            const res = (await publishGTM({ forms: publishData })) as FeatureResponse;
            console.log('res', res);

            if (res.success && resCreateVersion.success) {
              await handleResponseSuccess(res, userId, setIsDrawerOpen);
            } else {
              handleResponseErrors(res, dispatch);
            }
          }

          if (nonLiveEnvironments.length > 0) {
            const resUpdateEnv = (await UpdateEnvs({
              forms: createVersionData.map((data) => ({
                ...data,
                containerVersionId: versionPath,
                environmentId: nonLiveEnvironments.find((env) => (env ? env.split('-')[0] : '')),
              })),
            })) as FeatureResponse;

            console.log('resUpdateEnv', resUpdateEnv);

            if (resUpdateEnv.success) {
              await handleResponseSuccess(resUpdateEnv, userId, setIsDrawerOpen);
            } else {
              handleResponseErrors(resUpdateEnv, dispatch);
            }
          }
        }

        form.reset({ forms: [formDataDefaults] });
      } catch (error) {
        toast.error('An unexpected error occurred.', {
          action: {
            label: 'Close',
            onClick: () => toast.dismiss(),
          },
        });
      } finally {
        dispatch(setLoading(false)); // Set loading to false
      }
    } else if (activeTab === 'version') {
      showToast('Creating version...', false);

      try {
        const createVersionData = extractCreateVersionData(forms);
        const res = (await createGTMVersion({ forms: createVersionData })) as FeatureResponse;

        if (res.success) {
          await handleResponseSuccess(res, userId, setIsDrawerOpen);
        } else {
          handleResponseErrors(res, dispatch);
        }

        form.reset({ forms: [formDataDefaults] });
      } catch (error) {
        toast.error('An unexpected error occurred.', {
          action: {
            label: 'Close',
            onClick: () => toast.dismiss(),
          },
        });
      } finally {
        dispatch(setLoading(false)); // Set loading to false
      }
    }
  };

  const handleCheckboxChange = (checked, item, index) => {
    console.log('itme', item);

    const [accountId, containerId, workspaceId, environmentId, name] = item.split('-');

    const envId = environmentId;

    const forms = form.watch('forms');
    const fieldValue = Array.isArray(forms[index].createVersion.entityId)
      ? forms[index].createVersion.entityId
      : [];

    const newEntityId = checked
      ? [...fieldValue, item]
      : fieldValue.filter((value) => value !== item);

    console.log('newEntityId', newEntityId);

    const envValue = forms[index].environmentId ? forms[index].environmentId.split(',') : [];
    const newEnvValue = checked
      ? [...envValue, `${environmentId}-${name}`]
      : envValue.filter((value) => value !== `${environmentId}-${name}`);

    console.log('newEnvValue', newEnvValue);

    // Update both accountId and createVersion.entityId
    form.setValue(`forms.${index}.accountId`, accountId);
    form.setValue(`forms.${index}.containerId`, containerId);
    form.setValue(`forms.${index}.createVersion.entityId`, newEntityId);
    form.setValue(`forms.${index}.environmentId`, newEnvValue.join(','));
  };

  console.log('form errors', form.formState.errors);

  return (
    <Drawer
      snapPoints={[0.4, 1]}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
      open={isDrawerOpen}
      onOpenChange={setIsDrawerOpen}
    >
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          disabled={changes.length === 0}
        >
          Publish
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
            {fields.map((field, index) => {
              return (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(processForm)} className="space-y-6">
                    <Card>
                      <CardHeader className="grid grid-cols-2 items-center">
                        <CardTitle className="col-start-1 col-end-2">
                          Submission Configuration
                        </CardTitle>
                        <Button type="submit" className="col-start-2 col-end-3 justify-self-end">
                          {loading ? 'Submitting...' : 'Submit'}
                        </Button>
                      </CardHeader>

                      <Tabs defaultValue="publish" value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger
                            value="publish"
                            className={`relative p-2 transition-colors ${activeTab === 'publish' ? 'bg-blue-100 shadow-md' : 'hover:bg-blue-50'
                              }`}
                          >
                            Pubish and Create Version
                          </TabsTrigger>
                          <TabsTrigger
                            value="version"
                            className={`relative p-2 transition-colors ${activeTab === 'version' ? 'bg-blue-100 shadow-md' : 'hover:bg-blue-50'
                              }`}
                          >
                            Create Version
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="publish">
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <FormField
                                  control={form.control}
                                  name={`forms.${index}.createVersion.name`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Version Name</FormLabel>
                                      <FormDescription>
                                        The version name will be applied to all containers you are
                                        trying to publish.
                                      </FormDescription>
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
                                    <FormDescription>
                                      The version description will be applied to all containers you
                                      are trying to publish. Optional.
                                    </FormDescription>
                                    <FormControl>
                                      <Textarea
                                        id="description"
                                        rows={3}
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

                            <div className="flex">
                              <div className="space-y-2 pr-10">
                                <FormField
                                  control={form.control}
                                  name={`forms.${index}.createVersion.entityId`}
                                  render={() => (
                                    <FormItem>
                                      <div className="mb-4">
                                        <FormLabel className="text-base">
                                          Choose GTM Entity
                                        </FormLabel>
                                        <FormDescription>
                                          Select the GTM entities you want to publish the
                                          changes to.
                                        </FormDescription>
                                      </div>
                                      {combinedInfo.map((item) => (
                                        <FormItem key={`${item.accountId}-${item.containerId}`}>
                                          {item.environments.map((env) => {
                                            return (
                                              <FormField
                                                key={`${item.accountId}-${item.containerId}-${env.environmentId}`} // Ensure a unique key
                                                control={form.control}
                                                name={`forms.${index}.createVersion.entityId`}
                                                render={({ field }) => {
                                                  // Ensure field.value is an array
                                                  const fieldValue = Array.isArray(field.value)
                                                    ? field.value
                                                    : [];
                                                  const envId = `${item.accountId}-${item.containerId}-${item.workspaceId}-${env.environmentId}-${env.name}`;
                                                  return (
                                                    <FormItem
                                                      key={envId}
                                                      className="flex flex-row items-start space-x-3 space-y-0"
                                                    >
                                                      <FormControl>
                                                        <Checkbox
                                                          checked={fieldValue.includes(envId)}
                                                          onCheckedChange={(checked) =>
                                                            handleCheckboxChange(
                                                              checked,
                                                              envId,
                                                              index
                                                            )
                                                          }
                                                        />
                                                      </FormControl>
                                                      <FormLabel className="font-normal">
                                                        {env.name} - {item.accountName} -{' '}
                                                        {item.containerName} (ID:{' '}
                                                        {env.environmentId})
                                                      </FormLabel>
                                                    </FormItem>
                                                  );
                                                }}
                                              />
                                            );
                                          })}
                                          <FormMessage />
                                        </FormItem>
                                      ))}

                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </TabsContent>
                        <TabsContent value="version">
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <FormField
                                  control={form.control}
                                  name={`forms.${index}.createVersion.name`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Version Name</FormLabel>
                                      <FormDescription>
                                        The version name will be applied to all containers you are
                                        trying to publish.
                                      </FormDescription>
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
                                    <FormDescription>
                                      The version description will be applied to all containers you
                                      are trying to publish. Optional.
                                    </FormDescription>
                                    <FormControl>
                                      <Textarea
                                        id="description"
                                        rows={3}
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
                            <div className="space-y-2">
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
                                        key={`${item.accountId}-${item.containerId}`} // Ensure a unique key
                                        control={form.control}
                                        name={`forms.${index}.createVersion.entityId`}
                                        render={({ field }) => {
                                          // Ensure field.value is an array
                                          const fieldValue = Array.isArray(field.value)
                                            ? field.value
                                            : [];
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
                                                  onCheckedChange={(checked) =>
                                                    handleCheckboxChange(
                                                      checked,
                                                      `${item.accountId}-${item.containerId}-${item.workspaceId}`,
                                                      index
                                                    )
                                                  }
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
                      </Tabs>
                    </Card>
                  </form>
                </Form>
              );
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
