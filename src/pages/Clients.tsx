import { useState, useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Client } from '@/lib/types'

export default function Clients() {
  const { clients, invoices, deleteClient, addClient, updateClient } = useStore()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null)

  const filteredClients = useMemo(() => {
    if (!searchQuery) return clients
    const query = searchQuery.toLowerCase()
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query) ||
        client.phone.includes(query)
    )
  }, [clients, searchQuery])

  const getClientStats = (clientId: string) => {
    const clientInvoices = invoices.filter((inv) => inv.clientId === clientId)
    const totalInvoices = clientInvoices.length
    const outstanding = clientInvoices
      .filter((inv) => inv.status === 'unpaid' || inv.status === 'overdue')
      .reduce((sum, inv) => {
        const paid = inv.payments.reduce((pSum, p) => pSum + p.amount, 0)
        return sum + (inv.total - paid)
      }, 0)
    return { totalInvoices, outstanding }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const clientData: Partial<Client> = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      address: formData.get('address') as string,
      taxId: formData.get('taxId') as string || undefined,
    }

    if (editingClient) {
      updateClient(editingClient.id, clientData)
      toast({
        title: 'Client updated',
        description: 'Client information has been updated successfully.',
      })
    } else {
      const newClient: Client = {
        id: `client-${Date.now()}`,
        ...clientData,
        createdAt: new Date().toISOString().split('T')[0],
      } as Client
      addClient(newClient)
      toast({
        title: 'Client added',
        description: 'New client has been added successfully.',
      })
    }
    setIsDialogOpen(false)
    setEditingClient(null)
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setIsDialogOpen(true)
  }

  const handleDelete = () => {
    if (deleteClientId) {
      deleteClient(deleteClientId)
      toast({
        title: 'Client deleted',
        description: 'Client has been deleted successfully.',
      })
      setDeleteClientId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-muted-foreground">Manage your clients</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingClient(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
                <DialogDescription>
                  {editingClient ? 'Update client information' : 'Add a new client to your system'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingClient?.name}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={editingClient?.email}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    defaultValue={editingClient?.phone}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    name="address"
                    defaultValue={editingClient?.address}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="taxId">Tax ID</Label>
                  <Input
                    id="taxId"
                    name="taxId"
                    defaultValue={editingClient?.taxId}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    setEditingClient(null)
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">{editingClient ? 'Update' : 'Add'} Client</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Total Invoices</TableHead>
              <TableHead>Outstanding</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No clients found
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => {
                const stats = getClientStats(client.id)
                return (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.phone}</TableCell>
                    <TableCell>{stats.totalInvoices}</TableCell>
                    <TableCell>{formatCurrency(stats.outstanding)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(client)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteClientId(client.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteClientId} onOpenChange={() => setDeleteClientId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the client and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
