'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  CheckCircle,
  Building,
  PlusCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface CreatedUser {
  id: string;
  username: string;
  password?: string;
  branch: string;
  status: 'active' | 'inactive';
}

interface BranchItem {
  id: string;
  name: string;
  code: string;
  region: string;
  city: string;
  address: string;
}

const defaultBranches: BranchItem[] = [
  { id: 'blr01', name: 'Bangalore Indiranagar', code: 'BLR01', region: 'South', city: 'Bangalore', address: '12nd Main, Indiranagar' },
  { id: 'kch02', name: 'Kochi Kakkanad', code: 'KCH02', region: 'South', city: 'Kochi', address: 'Kakkanad, Kochi' },
  { id: 'clt03', name: 'Calicut Bypass', code: 'CLT03', region: 'South', city: 'Calicut', address: 'Bypass Rd, Calicut' }
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'user_mgmt' | 'branch_mgmt'>('user_mgmt');
  
  // User Mgmt States
  const [createdUsers, setCreatedUsers] = useState<CreatedUser[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [branch, setBranch] = useState('Bangalore Indiranagar (BLR01)');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // Branch Mgmt States
  const [createdBranches, setCreatedBranches] = useState<BranchItem[]>([]);
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchRegion, setBranchRegion] = useState('');
  const [branchCity, setBranchCity] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchStatusMsg, setBranchStatusMsg] = useState<string | null>(null);

  // Load from local storage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUsers = localStorage.getItem('mouzy_mock_created_users');
      if (storedUsers) {
        setCreatedUsers(JSON.parse(storedUsers));
      }
      
      const storedBranches = localStorage.getItem('mouzy_mock_created_branches');
      if (storedBranches) {
        setCreatedBranches(JSON.parse(storedBranches));
      }
    }
  }, []);

  const allBranches: BranchItem[] = [
    ...defaultBranches,
    ...createdBranches
  ];

  // Set default select option if it changes
  useEffect(() => {
    if (allBranches.length > 0) {
      setBranch(`${allBranches[0].name} (${allBranches[0].code})`);
    }
  }, [createdBranches]);

  // Save new user
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      alert('Please fill out username and password fields.');
      return;
    }

    const newUser: CreatedUser = {
      id: crypto.randomUUID(),
      username: username.trim(),
      password: password,
      branch: branch,
      status: 'active'
    };

    const updated = [...createdUsers, newUser];
    setCreatedUsers(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mouzy_mock_created_users', JSON.stringify(updated));
    }

    setUsername('');
    setPassword('');
    setStatusMsg(`Account "${newUser.username}" created successfully!`);
    setTimeout(() => setStatusMsg(null), 3000);
  };

  // Delete a user
  const handleDeleteUser = (id: string) => {
    const updated = createdUsers.filter(u => u.id !== id);
    setCreatedUsers(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mouzy_mock_created_users', JSON.stringify(updated));
    }
  };

  // Save new branch
  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName || !branchCode || !branchCity) {
      alert('Please fill out Name, Code, and City fields.');
      return;
    }

    const newBranch: BranchItem = {
      id: crypto.randomUUID(),
      name: branchName.trim(),
      code: branchCode.trim().toUpperCase(),
      region: branchRegion.trim() || 'South',
      city: branchCity.trim(),
      address: branchAddress.trim() || ''
    };

    const updated = [...createdBranches, newBranch];
    setCreatedBranches(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mouzy_mock_created_branches', JSON.stringify(updated));
    }

    setBranchName('');
    setBranchCode('');
    setBranchRegion('');
    setBranchCity('');
    setBranchAddress('');
    setBranchStatusMsg(`Branch "${newBranch.name}" added successfully!`);
    setTimeout(() => setBranchStatusMsg(null), 3000);
  };

  // Delete a branch
  const handleDeleteBranch = (id: string) => {
    const updated = createdBranches.filter(b => b.id !== id);
    setCreatedBranches(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mouzy_mock_created_branches', JSON.stringify(updated));
    }
  };

  const tabs = [
    { id: 'user_mgmt', name: 'User Management', icon: Users },
    { id: 'branch_mgmt', name: 'Branch Management', icon: Building },
  ] as const;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-4 md:px-6 font-sans select-none">
      
      {/* Page Header */}
      <div className="border-b border-stone-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-black text-slate-855 dark:text-white uppercase tracking-tight">
          System Settings
        </h1>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
          Configure active branch outlets and login credential keys.
        </p>
      </div>

      {/* Tabs list (Simplified to User & Branch Mgmt) */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 p-2.5 rounded-2xl shadow-sm flex flex-wrap gap-2 items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${
                isActive 
                  ? 'bg-[#2e7d32] text-white shadow-sm' 
                  : 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-white' : 'text-slate-550'} />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="min-h-[50vh]">
        
        {/* Tab 1: User Management */}
        {activeTab === 'user_mgmt' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
            
            {/* Accounts list */}
            <Card className="lg:col-span-2 border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl">
              <CardHeader className="border-b border-slate-105 dark:border-slate-900 bg-slate-50/20 py-4">
                <CardTitle className="text-sm font-black tracking-wider uppercase text-slate-855 dark:text-white">
                  Active Accounts Registry
                </CardTitle>
                <CardDescription className="text-xs">
                  List of managers and cashiers authorized to access terminals.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-850 sticky top-0">
                    <TableRow className="hover:bg-transparent border-slate-200 dark:border-slate-850">
                      <TableHead className="text-[9px] font-black text-slate-500 uppercase tracking-wider pl-6">Username</TableHead>
                      <TableHead className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Branch Outlet</TableHead>
                      <TableHead className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Status</TableHead>
                      <TableHead className="text-[9px] font-black text-slate-500 uppercase tracking-wider text-right pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Default Manager User */}
                    <TableRow className="border-slate-100 dark:border-slate-900">
                      <TableCell className="text-xs font-bold text-slate-800 dark:text-slate-200 py-3.5 pl-6 font-mono">
                        mouzy@mouzyerp.com
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 dark:text-slate-350 py-3.5">
                        Bangalore Indiranagar (BLR01)
                      </TableCell>
                      <TableCell className="py-3.5">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700 ring-1 ring-inset ring-emerald-600/10 dark:bg-emerald-950/20 dark:text-emerald-450">
                          Active (Default)
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-6 py-3.5 text-slate-400 text-xs italic">
                        System Locked
                      </TableCell>
                    </TableRow>

                    {/* Custom Users */}
                    {createdUsers.map((user) => (
                      <TableRow key={user.id} className="border-slate-100 dark:border-slate-900">
                        <TableCell className="text-xs font-bold text-slate-850 dark:text-slate-200 py-3.5 pl-6 font-mono">
                          {user.username}
                        </TableCell>
                        <TableCell className="text-xs text-slate-750 dark:text-slate-350 py-3.5">
                          {user.branch}
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700 ring-1 ring-inset ring-emerald-600/10 dark:bg-emerald-950/20 dark:text-emerald-450">
                            Active
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-6 py-3.5">
                          <Button 
                            onClick={() => handleDeleteUser(user.id)}
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-rose-500 hover:text-rose-650 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}

                    {createdUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-slate-400 dark:text-slate-600 text-xs font-semibold">
                          No custom user accounts created. Use the form to add branch staff.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Create User Form */}
            <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl">
              <CardHeader className="border-b border-slate-100 dark:border-slate-900 bg-slate-50/20 py-4">
                <CardTitle className="text-sm font-black tracking-wider uppercase text-slate-855 dark:text-white flex items-center gap-2">
                  <UserPlus size={16} className="text-[#2e7d32]" />
                  <span>Create New User</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Create system access for cashiers and branch managers
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleCreateUser}>
                <CardContent className="space-y-4 pt-6">
                  {statusMsg && (
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-3 text-xs font-bold text-emerald-700 dark:text-emerald-450 border border-emerald-250 dark:border-emerald-900/50 flex items-center gap-1.5 justify-center">
                      <CheckCircle size={14} />
                      <span>{statusMsg}</span>
                    </div>
                  )}

                  {/* Branch selection */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Branch
                    </Label>
                    <select
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 p-2.5 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-[#2e7d32] focus:border-[#2e7d32] outline-none h-11"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                    >
                      {allBranches.map((b) => (
                        <option key={b.id} value={`${b.name} (${b.code})`}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Username */}
                  <div className="space-y-1.5">
                    <Label htmlFor="new-username" className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Username
                    </Label>
                    <Input
                      id="new-username"
                      type="text"
                      placeholder="e.g. cashier.blr01"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-11 font-semibold text-xs rounded-xl"
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5 font-sans">
                    <Label htmlFor="new-password" className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showCreatePassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 font-semibold text-xs rounded-xl pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCreatePassword(!showCreatePassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showCreatePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-slate-100 dark:border-slate-900 bg-slate-50/10 py-3.5 px-6">
                  <Button 
                    type="submit" 
                    className="bg-[#2e7d32] hover:bg-[#276e2a] text-white font-black uppercase tracking-wider text-xs rounded-xl w-full h-11 transition-colors"
                  >
                    Create System User
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        )}

        {/* Tab 2: Branch Management */}
        {activeTab === 'branch_mgmt' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
            
            {/* Branches Registry List */}
            <Card className="lg:col-span-2 border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl">
              <CardHeader className="border-b border-slate-100 dark:border-slate-900 bg-slate-50/20 py-4">
                <CardTitle className="text-sm font-black tracking-wider uppercase text-slate-855 dark:text-white">
                  Active Branch Outlets
                </CardTitle>
                <CardDescription className="text-xs">
                  Registry of physical store branches connected to the central ERP.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-850">
                    <TableRow className="hover:bg-transparent border-slate-200 dark:border-slate-850">
                      <TableHead className="text-[9px] font-black text-slate-500 uppercase tracking-wider pl-6">Branch Name</TableHead>
                      <TableHead className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Code</TableHead>
                      <TableHead className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Region</TableHead>
                      <TableHead className="text-[9px] font-black text-slate-500 uppercase tracking-wider">City</TableHead>
                      <TableHead className="text-[9px] font-black text-slate-500 uppercase tracking-wider text-right pr-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Render default branches */}
                    {defaultBranches.map((b) => (
                      <TableRow key={b.id} className="border-slate-100 dark:border-slate-900">
                        <TableCell className="text-xs font-bold text-slate-800 dark:text-slate-200 py-3.5 pl-6 font-sans">
                          {b.name}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-700 dark:text-slate-350 py-3.5">
                          {b.code}
                        </TableCell>
                        <TableCell className="text-xs text-slate-700 dark:text-slate-350 py-3.5">
                          {b.region}
                        </TableCell>
                        <TableCell className="text-xs text-slate-750 dark:text-slate-350 py-3.5">
                          {b.city}
                        </TableCell>
                        <TableCell className="text-right pr-6 py-3.5 text-slate-400 text-xs italic">
                          System Default
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Render custom created branches */}
                    {createdBranches.map((b) => (
                      <TableRow key={b.id} className="border-slate-100 dark:border-slate-900">
                        <TableCell className="text-xs font-bold text-slate-850 dark:text-slate-200 py-3.5 pl-6 font-sans">
                          {b.name}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-700 dark:text-slate-350 py-3.5">
                          {b.code}
                        </TableCell>
                        <TableCell className="text-xs text-slate-700 dark:text-slate-350 py-3.5">
                          {b.region}
                        </TableCell>
                        <TableCell className="text-xs text-slate-750 dark:text-slate-350 py-3.5">
                          {b.city}
                        </TableCell>
                        <TableCell className="text-right pr-6 py-3.5">
                          <Button 
                            onClick={() => handleDeleteBranch(b.id)}
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-rose-500 hover:text-rose-650 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Create New Branch Form */}
            <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-sm rounded-2xl">
              <CardHeader className="border-b border-slate-100 dark:border-slate-900 bg-slate-50/20 py-4">
                <CardTitle className="text-sm font-black tracking-wider uppercase text-slate-855 dark:text-white flex items-center gap-2">
                  <PlusCircle size={16} className="text-[#2e7d32]" />
                  <span>Add New Branch</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Connect a new branch outlet location to ERP records.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleCreateBranch}>
                <CardContent className="space-y-3.5 pt-6">
                  {branchStatusMsg && (
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-3 text-xs font-bold text-emerald-700 dark:text-emerald-450 border border-emerald-250 dark:border-emerald-900/50 flex items-center gap-1.5 justify-center">
                      <CheckCircle size={14} />
                      <span>{branchStatusMsg}</span>
                    </div>
                  )}

                  {/* Branch Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="branch-name" className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Branch Name
                    </Label>
                    <Input
                      id="branch-name"
                      type="text"
                      placeholder="e.g. Chennai OMR"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      className="h-11 font-semibold text-xs rounded-xl"
                    />
                  </div>

                  {/* Branch Code */}
                  <div className="space-y-1.5">
                    <Label htmlFor="branch-code" className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Branch Code
                    </Label>
                    <Input
                      id="branch-code"
                      type="text"
                      placeholder="e.g. CHN04"
                      value={branchCode}
                      onChange={(e) => setBranchCode(e.target.value)}
                      className="h-11 font-semibold text-xs rounded-xl"
                    />
                  </div>

                  {/* Region & City */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="branch-region" className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Region
                      </Label>
                      <Input
                        id="branch-region"
                        type="text"
                        placeholder="South"
                        value={branchRegion}
                        onChange={(e) => setBranchRegion(e.target.value)}
                        className="h-11 font-semibold text-xs rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="branch-city" className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        City
                      </Label>
                      <Input
                        id="branch-city"
                        type="text"
                        placeholder="Chennai"
                        value={branchCity}
                        onChange={(e) => setBranchCity(e.target.value)}
                        className="h-11 font-semibold text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-1.5">
                    <Label htmlFor="branch-address" className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Local Address
                    </Label>
                    <Input
                      id="branch-address"
                      type="text"
                      placeholder="Old Mahabalipuram Rd, Chennai"
                      value={branchAddress}
                      onChange={(e) => setBranchAddress(e.target.value)}
                      className="h-11 font-semibold text-xs rounded-xl"
                    />
                  </div>
                </CardContent>
                <CardFooter className="border-t border-slate-100 dark:border-slate-900 bg-slate-50/10 py-3.5 px-6">
                  <Button 
                    type="submit" 
                    className="bg-[#2e7d32] hover:bg-[#276e2a] text-white font-black uppercase tracking-wider text-xs rounded-xl w-full h-11 transition-colors"
                  >
                    Create Branch
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
