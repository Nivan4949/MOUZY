'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Building, 
  DollarSign, 
  Settings as SettingsIcon, 
  CloudLightning,
  AlertTriangle,
  RotateCw
} from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-4 md:px-6">
      {/* Header */}
      <div className="border-b border-stone-200 dark:border-slate-800 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">System Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure ERP tenant accounts, regional branch controls, petty cash rules, and data sync frequencies.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Tenant Configuration */}
        <Card className="border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl">
          <CardHeader className="border-b border-stone-100 dark:border-slate-900 bg-stone-50/50 dark:bg-slate-950/20 py-4">
            <CardTitle className="text-base font-bold tracking-tight flex items-center gap-2 text-slate-850 dark:text-white">
              <Building className="h-5 w-5 text-primary" />
              <span>Tenant Profile</span>
            </CardTitle>
            <CardDescription className="text-xs">Manage your brand and active ERP domain settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tenant Name</Label>
              <Input defaultValue="Mouzy Outlets Group" disabled className="h-11 font-semibold" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subdomain</Label>
              <div className="flex rounded-xl shadow-sm border border-stone-200 bg-stone-50/20 overflow-hidden">
                <span className="inline-flex items-center px-3 text-stone-500 text-sm border-r border-stone-200 select-none bg-stone-50">
                  https://
                </span>
                <Input defaultValue="mouzy" disabled className="border-0 focus-visible:ring-0 shadow-none rounded-none h-11 font-semibold" />
                <span className="inline-flex items-center px-3 text-stone-500 text-sm border-l border-stone-200 select-none bg-stone-50">
                  .mouzyerp.com
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Branch Controls */}
        <Card className="border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl">
          <CardHeader className="border-b border-stone-100 dark:border-slate-900 bg-stone-50/50 dark:bg-slate-950/20 py-4">
            <CardTitle className="text-base font-bold tracking-tight flex items-center gap-2 text-slate-850 dark:text-white">
              <SettingsIcon className="h-5 w-5 text-primary" />
              <span>Outlet Configurations</span>
            </CardTitle>
            <CardDescription className="text-xs">Configure parameters specific to this local branch outlet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Branch Code</Label>
                <Input defaultValue="BLR01" disabled className="h-11 font-semibold" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Branch Region</Label>
                <Input defaultValue="South (Bangalore)" disabled className="h-11 font-semibold" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Local Address</Label>
              <Input defaultValue="12nd Main, Indiranagar, Bangalore" disabled className="h-11 font-semibold" />
            </div>
          </CardContent>
        </Card>

        {/* Petty Cash Rules */}
        <Card className="border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl">
          <CardHeader className="border-b border-stone-100 dark:border-slate-900 bg-stone-50/50 dark:bg-slate-950/20 py-4">
            <CardTitle className="text-base font-bold tracking-tight flex items-center gap-2 text-slate-850 dark:text-white">
              <DollarSign className="h-5 w-5 text-primary" />
              <span>Petty Cash Thresholds</span>
            </CardTitle>
            <CardDescription className="text-xs">Define limits requiring HQ approval overrides</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Petty Cash Expense Limit (₹)</Label>
              <Input defaultValue="1500.00" className="h-11 font-semibold" />
              <p className="text-[10px] text-stone-400 mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>Expenses exceeding this value require Area Manager/HQ override approval.</span>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expected Float Reserve (₹)</Label>
              <Input defaultValue="10000.00" className="h-11 font-semibold" />
            </div>
          </CardContent>
          <CardFooter className="border-t border-stone-100 dark:border-slate-900 bg-stone-50/20 py-3.5 px-6">
            <Button className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl w-full h-11">
              Save Rule Policies
            </Button>
          </CardFooter>
        </Card>

        {/* Database & Local Sync */}
        <Card className="border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl">
          <CardHeader className="border-b border-stone-100 dark:border-slate-900 bg-stone-50/50 dark:bg-slate-950/20 py-4">
            <CardTitle className="text-base font-bold tracking-tight flex items-center gap-2 text-slate-850 dark:text-white">
              <CloudLightning className="h-5 w-5 text-primary" />
              <span>Offline Datastore & Sync</span>
            </CardTitle>
            <CardDescription className="text-xs">Monitor status of browser-cache syncing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6 text-sm text-slate-650 dark:text-slate-400 font-medium">
            <div className="flex justify-between items-center p-3 rounded-xl border border-stone-100 bg-stone-50/10">
              <span>Active Database Connection</span>
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-600/10 dark:bg-amber-950/20 dark:text-amber-400">
                Mock Mode (Fallback Active)
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl border border-stone-100 bg-stone-50/10">
              <span>Daybook Cache Count</span>
              <span className="font-mono font-bold text-slate-850">17 Local Records</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl border border-stone-100 bg-stone-50/10">
              <span>Last Synchronized Timestamp</span>
              <span className="font-mono text-xs">Just now</span>
            </div>
          </CardContent>
          <CardFooter className="border-t border-stone-100 dark:border-slate-900 bg-stone-50/20 py-3.5 px-6">
            <Button variant="outline" className="border-stone-300 hover:bg-stone-50 font-semibold rounded-xl w-full h-11 flex items-center justify-center gap-2 text-slate-800 bg-white dark:bg-slate-900 dark:border-slate-850 dark:text-slate-100">
              <RotateCw className="h-4 w-4" /> Purge Local Cache & Refresh
            </Button>
          </CardFooter>
        </Card>

      </div>
    </div>
  );
}
