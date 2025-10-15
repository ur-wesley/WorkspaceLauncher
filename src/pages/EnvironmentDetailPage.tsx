import { useParams } from "@solidjs/router";
import type { Component } from "solid-js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
 Card,
 CardContent,
 CardDescription,
 CardHeader,
 CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const EnvironmentDetailPage: Component = () => {
 const params = useParams();

 return (
  <div class="p-6 space-y-6">
   <div class="flex items-center justify-between">
    <div>
     <div class="flex items-center gap-2 text-sm text-muted-foreground mb-2">
      <span>Workspaces</span>
      <div class="i-mdi-chevron-right w-4 h-4" />
      <span>Workspace {params.workspaceId}</span>
      <div class="i-mdi-chevron-right w-4 h-4" />
      <span>Environment {params.envId}</span>
     </div>
     <h1 class="text-3xl font-bold tracking-tight">Development Environment</h1>
     <p class="text-muted-foreground">
      Configure actions, variables, and run this environment
     </p>
    </div>
    <div class="flex gap-2">
     <Button variant="outline">
      <div class="i-mdi-content-copy w-4 h-4 mr-2" />
      Duplicate
     </Button>
     <Button>
      <div class="i-mdi-play w-4 h-4 mr-2" />
      Run Environment
     </Button>
    </div>
   </div>

   <Separator />

   <Tabs defaultValue="actions" class="space-y-6">
    <TabsList class="grid w-full grid-cols-4">
     <TabsTrigger value="actions">Actions</TabsTrigger>
     <TabsTrigger value="variables">Variables</TabsTrigger>
     <TabsTrigger value="runs">Run History</TabsTrigger>
     <TabsTrigger value="logs">Live Logs</TabsTrigger>
    </TabsList>

    <TabsContent value="actions" class="space-y-6">
     <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold">Actions</h2>
      <Button>
       <div class="i-mdi-plus w-4 h-4 mr-2" />
       Add Action
      </Button>
     </div>

     <div class="space-y-4">
      <Card>
       <CardHeader class="pb-3">
        <div class="flex items-center justify-between">
         <div class="flex items-center gap-3">
          <div class="i-mdi-microsoft-visual-studio-code w-6 h-6 text-blue-500" />
          <div>
           <CardTitle class="text-base">Open VS Code</CardTitle>
           <CardDescription>Open project in VS Code</CardDescription>
          </div>
         </div>
         <div class="flex items-center gap-2">
          <Badge variant="secondary">vscode</Badge>
          <Button variant="ghost" size="sm">
           <div class="i-mdi-dots-vertical w-4 h-4" />
          </Button>
         </div>
        </div>
       </CardHeader>
       <CardContent class="pt-0">
        <div class="grid grid-cols-2 gap-4 text-sm">
         <div>
          <span class="text-muted-foreground">Command:</span>
          <p class="font-mono">code $&#123;PROJECT_PATH&#125;</p>
         </div>
         <div>
          <span class="text-muted-foreground">Timeout:</span>
          <p>30s</p>
         </div>
        </div>
       </CardContent>
      </Card>

      <Card class="border-dashed border-2 hover:(border-primary) transition-colors cursor-pointer">
       <CardContent class="flex flex-col items-center justify-center py-12">
        <div class="i-mdi-plus-circle w-12 h-12 text-muted-foreground mb-4" />
        <p class="text-sm text-muted-foreground text-center">
         Add your first action to get started
        </p>
       </CardContent>
      </Card>
     </div>
    </TabsContent>

    <TabsContent value="variables" class="space-y-6">
     <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold">Variables</h2>
      <Button>
       <div class="i-mdi-plus w-4 h-4 mr-2" />
       Add Variable
      </Button>
     </div>

     <div class="text-center py-12">
      <div class="i-mdi-variable w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <h3 class="text-lg font-medium mb-2">No variables defined</h3>
      <p class="text-muted-foreground mb-4">
       Create variables to use in your actions and commands
      </p>
      <Button>
       <div class="i-mdi-plus w-4 h-4 mr-2" />
       Add Variable
      </Button>
     </div>
    </TabsContent>

    <TabsContent value="runs" class="space-y-6">
     <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold">Run History</h2>
      <div class="flex gap-2">
       <Button variant="outline" size="sm">
        <div class="i-mdi-filter w-4 h-4 mr-2" />
        Filter
       </Button>
       <Button variant="outline" size="sm">
        <div class="i-mdi-refresh w-4 h-4 mr-2" />
        Refresh
       </Button>
      </div>
     </div>

     <div class="text-center py-12">
      <div class="i-mdi-history w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <h3 class="text-lg font-medium mb-2">No runs yet</h3>
      <p class="text-muted-foreground mb-4">
       Run this environment to see execution history
      </p>
      <Button>
       <div class="i-mdi-play w-4 h-4 mr-2" />
       Run Environment
      </Button>
     </div>
    </TabsContent>

    <TabsContent value="logs" class="space-y-6">
     <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold">Live Logs</h2>
      <div class="flex gap-2">
       <Button variant="outline" size="sm">
        <div class="i-mdi-pause w-4 h-4 mr-2" />
        Pause
       </Button>
       <Button variant="outline" size="sm">
        <div class="i-mdi-delete w-4 h-4 mr-2" />
        Clear
       </Button>
      </div>
     </div>

     <Card>
      <CardContent class="p-0">
       <div class="bg-slate-950 text-green-400 font-mono text-sm p-4 min-h-96 overflow-auto">
        <div class="text-muted-foreground">
         Waiting for environment execution...
        </div>
       </div>
      </CardContent>
     </Card>
    </TabsContent>
   </Tabs>
  </div>
 );
};
