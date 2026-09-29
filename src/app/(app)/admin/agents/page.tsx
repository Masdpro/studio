'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminGate } from '@/components/admin/AdminGate';
import { AgentFormDialog } from '@/components/admin/AgentFormDialog';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { DeliveryAgent } from '@/lib/types';

const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<DeliveryAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<DeliveryAgent | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingAgent, setDeletingAgent] = useState<DeliveryAgent | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/agents');
      if (res.ok) setAgents((await res.json()).agents);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = () => {
    setEditingAgent(null);
    setIsFormOpen(true);
  };

  const handleEdit = (agent: DeliveryAgent) => {
    setEditingAgent(agent);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingAgent) return;
    const res = await fetch(`/api/admin/agents/${deletingAgent.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast({ title: 'Agent deleted', description: `${deletingAgent.name} has been removed.` });
      fetchData();
    } else {
      toast({ title: 'Failed to delete agent', variant: 'destructive' });
    }
    setDeletingAgent(null);
  };

  return (
    <AdminGate>
      <div className="container mx-auto py-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Admin
          </Link>
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Delivery Agents</h1>
            <p className="text-muted-foreground">The riders who pick up and deliver orders and errands.</p>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" /> New Agent
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          </div>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <Avatar className="h-10 w-10">
                        {agent.imageUrl && <AvatarImage src={agent.imageUrl} alt={agent.name} className="object-cover" />}
                        <AvatarFallback>{initials(agent.name)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell>
                      <div className="text-sm">{agent.phone}</div>
                      <div className="text-xs text-muted-foreground">{agent.email}</div>
                    </TableCell>
                    <TableCell>{agent.city}</TableCell>
                    <TableCell className="text-sm">
                      {agent.vehicleDetails ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right space-x-2 whitespace-nowrap">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(agent)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeletingAgent(agent)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {agents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No delivery agents yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AgentFormDialog agent={editingAgent} open={isFormOpen} onOpenChange={setIsFormOpen} onSaved={fetchData} />
      <DeleteConfirmDialog
        open={!!deletingAgent}
        onOpenChange={(open) => !open && setDeletingAgent(null)}
        title="Delete this delivery agent?"
        description={`"${deletingAgent?.name}" will be removed. Orders they already delivered keep their history.`}
        onConfirm={handleDelete}
      />
    </AdminGate>
  );
}
