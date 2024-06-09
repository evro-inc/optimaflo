'use client';
import { Button } from '@/src/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/src/components/ui/card';
import { Drawer, DrawerTrigger, DrawerOverlay, DrawerPortal, DrawerContent } from '@/src/components/ui/drawer';
import { Input } from '@/src/components/ui/input';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/src/components/ui/table';
import { Textarea } from '@/src/components/ui/textarea';
import { Label } from '@radix-ui/react-label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@radix-ui/react-tabs';
import clsx from 'clsx';
import { useState } from 'react';
import { DataTable } from './table/table';
import { columns } from './table/columns';

function PublishGTM(changes: any) {
  const [snap, setSnap] = useState<number | string | null>("250px");

  return (
    <Drawer
      snapPoints={[.40, 1]}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
    >
      <DrawerTrigger asChild>
        <Button variant="outline" type='button'>Submit</Button>
      </DrawerTrigger>
      <DrawerOverlay className="fixed inset-0 bg-black/40" />
      <DrawerPortal>
        <DrawerContent className="fixed flex flex-col bg-white border border-gray-200 border-b-none rounded-t-[10px] bottom-0 left-0 right-0 h-full max-h-[97%] mx-[-1px]">
          <div
            className={clsx("grid gap-6 p-6 mx-auto w-full pt-5", {
              "overflow-y-auto": snap === 1,
              "overflow-hidden": snap !== 1,
            })}
          >
            <Button>
              Publish
            </Button>
            <Card>
              <CardHeader>
                <CardTitle>Submission Configured</CardTitle>
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
