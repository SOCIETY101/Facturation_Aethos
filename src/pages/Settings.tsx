import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useCompany } from '@/hooks/useCompany'
import {
  updateCompany,
  getTaxRates,
  createTaxRate,
  updateTaxRate,
  deleteTaxRate,
} from '@/lib/api/company'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2, Upload, X } from 'lucide-react'
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
import { Database } from '@/lib/supabase'
import { uploadLogo } from '@/lib/api/company'

type TaxRate = Database['public']['Tables']['tax_rates']['Row']

export default function Settings() {
  const { user } = useAuth()
  const { company, loading: companyLoading, refresh: refreshCompany } = useCompany()
  const { toast } = useToast()
  const [deleteTaxId, setDeleteTaxId] = useState<string | null>(null)
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [loadingTaxRates, setLoadingTaxRates] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)

  // Load tax rates when company is available
  useEffect(() => {
    if (company) {
      loadTaxRates()
    }
  }, [company])

  const loadTaxRates = async () => {
    if (!company) return
    try {
      setLoadingTaxRates(true)
      const rates = await getTaxRates(company.id)
      setTaxRates(rates)
    } catch (error) {
      console.error('Error loading tax rates:', error)
      toast({
        title: 'Error',
        description: 'Failed to load tax rates',
        variant: 'destructive',
      })
    } finally {
      setLoadingTaxRates(false)
    }
  }

  const handleCompanySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!company) return

    setSaving(true)
    try {
      const formData = new FormData(e.currentTarget)
      await updateCompany(company.id, {
        name: formData.get('name') as string,
        email: formData.get('email') as string || null,
        phone: formData.get('phone') as string || null,
        address: formData.get('address') as string || null,
        city: formData.get('city') as string || null,
        postal_code: formData.get('postalCode') as string || null,
        country: formData.get('country') as string || null,
        tax_id: formData.get('taxId') as string || null,
        bank_name: formData.get('bankName') as string || null,
        bank_account: formData.get('bankAccount') as string || null,
        bank_iban: formData.get('bankIBAN') as string || null,
        bank_bic: formData.get('bankBIC') as string || null,
      })
      toast({
        title: 'Company settings updated',
        description: 'Company information has been saved successfully.',
      })
      // Refresh company data
      refreshCompany()
    } catch (error) {
      console.error('Error updating company:', error)
      toast({
        title: 'Error',
        description: 'Failed to update company information',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleInvoiceSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!company) return

    setSaving(true)
    try {
      const formData = new FormData(e.currentTarget)
      await updateCompany(company.id, {
        invoice_prefix: formData.get('prefix') as string,
        invoice_start_number: parseInt(formData.get('startingNumber') as string),
        quote_prefix: formData.get('quotePrefix') as string,
        quote_start_number: parseInt(formData.get('quoteStartingNumber') as string),
        default_payment_terms: formData.get('terms') as string || null,
      })
      toast({
        title: 'Invoice settings updated',
        description: 'Invoice and quote settings have been saved successfully.',
      })
      refreshCompany()
    } catch (error) {
      console.error('Error updating invoice settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to update invoice settings',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!company || !e.target.files?.[0]) return

    setLogoUploading(true)
    try {
      const file = e.target.files[0]
      await uploadLogo(company.id, file)
      toast({
        title: 'Logo uploaded',
        description: 'Company logo has been updated successfully.',
      })
      refreshCompany()
    } catch (error) {
      console.error('Error uploading logo:', error)
      toast({
        title: 'Error',
        description: 'Failed to upload logo',
        variant: 'destructive',
      })
    } finally {
      setLogoUploading(false)
    }
  }

  const handleAddTaxRate = async () => {
    if (!company) return

    try {
      const newTaxRate = await createTaxRate({
        company_id: company.id,
        name: '',
        rate: 20,
        is_default: false,
      })
      setTaxRates([...taxRates, newTaxRate])
    } catch (error) {
      console.error('Error creating tax rate:', error)
      toast({
        title: 'Error',
        description: 'Failed to create tax rate',
        variant: 'destructive',
      })
    }
  }

  const handleUpdateTaxRate = async (
    id: string,
    field: keyof TaxRate,
    value: string | number | boolean
  ) => {
    try {
      if (field === 'is_default' && value === true) {
        // Unset other defaults first
        const otherDefaults = taxRates.filter((t) => t.is_default && t.id !== id)
        for (const tax of otherDefaults) {
          await updateTaxRate(tax.id, { is_default: false })
        }
      }

      const updated = await updateTaxRate(id, { [field]: value })
      setTaxRates(taxRates.map((tax) => (tax.id === id ? updated : tax)))
    } catch (error) {
      console.error('Error updating tax rate:', error)
      toast({
        title: 'Error',
        description: 'Failed to update tax rate',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteTaxRate = async () => {
    if (!deleteTaxId) return

    try {
      await deleteTaxRate(deleteTaxId)
      setTaxRates(taxRates.filter((tax) => tax.id !== deleteTaxId))
      toast({
        title: 'Tax rate deleted',
        description: 'Tax rate has been deleted successfully.',
      })
      setDeleteTaxId(null)
    } catch (error) {
      console.error('Error deleting tax rate:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete tax rate',
        variant: 'destructive',
      })
    }
  }

  if (companyLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Company not found</h2>
          <p className="text-muted-foreground">
            Please set up your company first. This should happen automatically after signup.
          </p>
        </div>
      </div>
    )
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
                      defaultValue={company.name}
                      required
                      disabled={saving}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={company.email || ''}
                      disabled={saving}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      defaultValue={company.phone || ''}
                      disabled={saving}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address">Address *</Label>
                    <Input
                      id="address"
                      name="address"
                      defaultValue={company.address || ''}
                      required
                      disabled={saving}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        name="city"
                        defaultValue={company.city || ''}
                        required
                        disabled={saving}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="postalCode">Postal Code *</Label>
                      <Input
                        id="postalCode"
                        name="postalCode"
                        defaultValue={company.postal_code || ''}
                        required
                        disabled={saving}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="country">Country *</Label>
                    <Input
                      id="country"
                      name="country"
                      defaultValue={company.country || ''}
                      required
                      disabled={saving}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="taxId">Tax ID / ICE</Label>
                    <Input
                      id="taxId"
                      name="taxId"
                      defaultValue={company.tax_id || ''}
                      disabled={saving}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="logo">Company Logo</Label>
                    <div className="flex items-center gap-4">
                      {company.logo_url && (
                        <img
                          src={company.logo_url}
                          alt="Company logo"
                          className="h-20 w-20 object-contain border rounded"
                        />
                      )}
                      <div className="flex-1">
                        <Input
                          id="logo"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={logoUploading || saving}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Upload a logo for your company (max 5MB)
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-4">Bank Information</h3>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="bankName">Bank Name</Label>
                        <Input
                          id="bankName"
                          name="bankName"
                          defaultValue={company.bank_name || ''}
                          disabled={saving}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="bankAccount">Account Name</Label>
                        <Input
                          id="bankAccount"
                          name="bankAccount"
                          defaultValue={company.bank_account || ''}
                          disabled={saving}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="bankIBAN">IBAN</Label>
                        <Input
                          id="bankIBAN"
                          name="bankIBAN"
                          defaultValue={company.bank_iban || ''}
                          disabled={saving}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="bankBIC">BIC / SWIFT</Label>
                        <Input
                          id="bankBIC"
                          name="bankBIC"
                          defaultValue={company.bank_bic || ''}
                          disabled={saving}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Company Info'}
                </Button>
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
                        defaultValue={company.invoice_prefix}
                        required
                        disabled={saving}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="startingNumber">Starting Number *</Label>
                      <Input
                        id="startingNumber"
                        name="startingNumber"
                        type="number"
                        min="1"
                        defaultValue={company.invoice_start_number}
                        required
                        disabled={saving}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="quotePrefix">Quote Prefix *</Label>
                      <Input
                        id="quotePrefix"
                        name="quotePrefix"
                        defaultValue={company.quote_prefix}
                        required
                        disabled={saving}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="quoteStartingNumber">Quote Starting Number *</Label>
                      <Input
                        id="quoteStartingNumber"
                        name="quoteStartingNumber"
                        type="number"
                        min="1"
                        defaultValue={company.quote_start_number}
                        required
                        disabled={saving}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="terms">Terms & Conditions</Label>
                    <Textarea
                      id="terms"
                      name="terms"
                      defaultValue={company.default_payment_terms || ''}
                      rows={6}
                      placeholder="Enter payment terms and conditions..."
                      disabled={saving}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Invoice Settings'}
                </Button>
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
                <Button type="button" onClick={handleAddTaxRate} disabled={loadingTaxRates}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Tax Rate
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingTaxRates ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
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
                      {taxRates.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No tax rates configured
                          </TableCell>
                        </TableRow>
                      ) : (
                        taxRates.map((tax) => (
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
                                  handleUpdateTaxRate(
                                    tax.id,
                                    'rate',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-24"
                              />
                            </TableCell>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={tax.is_default}
                                onChange={(e) =>
                                  handleUpdateTaxRate(tax.id, 'is_default', e.target.checked)
                                }
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
              )}
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
