'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus, UserCheck, Shield, Mail, Calendar } from 'lucide-react';

const mockUsers = [
  { id: '1', name: 'Bangalore Manager', email: 'manager.402@mouzyerp.com', role: 'Super Admin', branch: 'Indiranagar (BLR01)', status: 'Active', since: 'Jun 2024' },
  { id: '2', name: 'Karthik Raja', email: 'karthik.blr@mouzyerp.com', role: 'Branch Manager', branch: 'Indiranagar (BLR01)', status: 'Active', since: 'Dec 2024' },
  { id: '3', name: 'Srinivas Murthy', email: 'srinivas.cashier@mouzyerp.com', role: 'Cashier', branch: 'Indiranagar (BLR01)', status: 'Active', since: 'Feb 2025' },
  { id: '4', name: 'HQ Auditor', email: 'auditor.hq@mouzyerp.com', role: 'HQ Auditor', branch: 'All Branches', status: 'Active', since: 'Jan 2024' },
];

export default function UsersPage() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-4 md:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 dark:border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">User Directory</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage outlet staff roles, local branch access rights, and security profiles.
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl px-4 py-2 h-10 shadow-sm self-start sm:self-center flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add User Account
        </Button>
      </div>

      {/* Users List Card */}
      <Card className="border border-stone-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-stone-100 dark:border-slate-900 bg-stone-50/50 dark:bg-slate-950/20 py-4">
          <CardTitle className="text-base font-bold tracking-tight text-slate-850 dark:text-white">Active Personnel</CardTitle>
          <CardDescription className="text-xs">Authorized users currently assigned to this tenant domain</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-stone-50/50 dark:bg-slate-950/20">
              <TableRow className="border-stone-100 dark:border-slate-900">
                <TableHead className="pl-6">Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>System Role</TableHead>
                <TableHead>Assigned Branch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-6">Member Since</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockUsers.map((user) => (
                <TableRow key={user.id} className="border-stone-100 dark:border-slate-900 hover:bg-stone-50/30">
                  <TableCell className="pl-6 font-semibold text-slate-800 dark:text-slate-200 py-4 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <UserCheck className="h-4 w-4" />
                    </div>
                    <span>{user.name}</span>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-stone-400" />
                      <span>{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-700 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-stone-500" />
                      <span>{user.role}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">{user.branch}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/10 dark:bg-emerald-950/30 dark:text-emerald-500">
                      {user.status}
                    </span>
                  </TableCell>
                  <TableCell className="pr-6 text-slate-500 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-stone-400" />
                      <span>{user.since}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
