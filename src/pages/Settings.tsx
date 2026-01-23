import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { TaxRate } from '@/lib/types'

export default function Settings() {
  const { settings, updateSettings } = useStore()
  const { toast } = useToast()
  const [deleteTaxId, setDeleteTaxId] = useState<string | null>(null)

  const handleCompanySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    updateSettings({
      company: {
        name: formData.get('name') as string,
        address: formData.get('address') as string,
        city: formData.get('city') as string,
        postalCode: formData.get('postalCode') as string,
        country: formData.get('country') as string,
        taxId: formData.get('taxId') as string,
        bankName: formData.get('bankName') as string,
        bankAccount: formData.get('bankAccount') as string,
        bankIBAN: formData.get('bankIBAN') as string,
        bankBIC: formData.get('bankBIC') as string,
        logo: settings.company.logo,
      },
    })
    toast({
      title: 'Company settings updated',
      description: 'Company information has been saved successfully.',
    })
  }

  const handleInvoiceSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    updateSettings({
      invoice: {
        prefix: formData.get('prefix') as string,
        startingNumber: parseInt(formData.get('startingNumber') as string),
        terms: formData.get('terms') as string,
      },
    })
    toast({
      title: 'Invoice settings updated',
      description: 'Invoice settings have been saved successfully.',
    })
  }

  const handleAddTaxRate = () => {
    const newTaxRate: TaxRate = {
      id: `tax-${Date.now()}`,
      name: '',
      rate: 20,
      default: false,
    }
    updateSettings({
      taxRates: [...settings.taxRates, newTaxRate],
    })
  }

  const handleUpdateTaxRate = (id: string, field: keyof TaxRate, value: string | number | boolean) => {
    updateSettings({
      taxRates: settings.taxRates.map((tax) =>
        tax.id === id ? { ...tax, [field]: value } : tax
      ),
    })
  }

  const handleDeleteTaxRate = () => {
    if (deleteTaxId) {
      updateSettings({
        taxRates: settings.taxRates.filter((tax) => tax.id !== deleteTaxId),
      })
      toast({
        title: 'Tax rate deleted',
        description: 'Tax rate has been deleted successfully.',
      })
      setDeleteTaxId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your application settings</p>
      </div>

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList>
          <TabsTrigger value="company">Company Info</TabsTrigger>
          <TabsTrigger value="invoice">Invoice Settings</TabsTrigger>
          <TabsTrigger value="tax">Tax Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Update your company details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCompanySubmit} className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Company Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={settings.company.name}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address">Address *</Label>
                    <Input
                      id="address"
                      name="address"
                      defaultValue={settings.company.address}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        name="city"
                        defaultValue={settings.company.city}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="postalCode">Postal Code *</Label>
                      <Input
                        id="postalCode"
                        name="postalCode"
                        defaultValue={settings.company.postalCode}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="country">Country *</Label>
                    <Input
                      id="country"
                      name="country"
                      defaultValue={settings.company.country}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="taxId">Tax ID / SIRET</Label>
                    <Input
                      id="taxId"
                      name="taxId"
                      defaultValue={settings.company.taxId}
                    />
                  </div>
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-4">Bank Information</h3>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="bankName">Bank Name *</Label>
                        <Input
                          id="bankName"
                          name="bankName"
                          defaultValue={settings.company.bankName}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="bankAccount">Account Name *</Label>
                        <Input
                          id="bankAccount"
                          name="bankAccount"
                          defaultValue={settings.company.bankAccount}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="bankIBAN">IBAN *</Label>
                        <Input
                          id="bankIBAN"
                          name="bankIBAN"
                          defaultValue={settings.company.bankIBAN}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="bankBIC">BIC / SWIFT *</Label>
                        <Input
                          id="bankBIC"
                          name="bankBIC"
                          defaultValue={settings.company.bankBIC}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <Button type="submit">Save Company Info</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoice">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Settings</CardTitle>
              <CardDescription>Configure invoice numbering and terms</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvoiceSubmit} className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="prefix">Invoice Prefix *</Label>
                      <Input
                        id="prefix"
                        name="prefix"
                        defaultValue={settings.invoice.prefix}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="startingNumber">Starting Number *</Label>
                      <Input
                        id="startingNumber"
                        name="startingNumber"
                        type="number"
                        min="1"
                        defaultValue={settings.invoice.startingNumber}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="terms">Terms & Conditions</Label>
                    <Textarea
                      id="terms"
                      name="terms"
                      defaultValue={settings.invoice.terms}
                      rows={6}
                      placeholder="Enter payment terms and conditions..."
                    />
                  </div>
                </div>
                <Button type="submit">Save Invoice Settings</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tax Rates</CardTitle>
                  <CardDescription>Manage your tax rates</CardDescription>
                </div>
                <Button type="button" onClick={handleAddTaxRate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Tax Rate
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Rate (%)</TableHead>
                      <TableHead>Default</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settings.taxRates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No tax rates configured
                        </TableCell>
                      </TableRow>
                    ) : (
                      settings.taxRates.map((tax) => (
                        <TableRow key={tax.id}>
                          <TableCell>
                            <Input
                              value={tax.name}
                              onChange={(e) =>
                                handleUpdateTaxRate(tax.id, 'name', e.target.value)
                              }
                              placeholder="Tax name"
                              className="w-full"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                              value={tax.rate}
                              onChange={(e) =>
                                handleUpdateTaxRate(tax.id, 'rate', parseFloat(e.target.value) || 0)
                              }
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={tax.default}
                              onChange={(e) => {
                                // Unset other defaults
                                const updatedRates = settings.taxRates.map((t) =>
                                  t.id === tax.id
                                    ? { ...t, default: e.target.checked }
                                    : { ...t, default: false }
                                )
                                updateSettings({ taxRates: updatedRates })
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTaxId(tax.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteTaxId} onOpenChange={() => setDeleteTaxId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the tax rate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTaxRate}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
