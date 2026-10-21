'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, Plus, RefreshCw, CheckCircle2, Building, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export default function AdminLocationsPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newLoc, setNewLoc] = useState({
    name: '',
    code: '',
    address: '',
    city: 'Phnom Penh',
    timezone: 'Asia/Phnom_Penh',
    isPickupDefault: false,
  })

  const { data: locations, isLoading, refetch } = useQuery({
    queryKey: ['admin-locations'],
    queryFn: async () => {
      const res = await fetch('/api/admin/locations')
      if (!res.ok) throw new Error('Failed to fetch locations')
      return res.json()
    },
  })

  const addLocationMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/admin/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to add location')
      return json
    },
    onSuccess: () => {
      toast.success('Location added successfully')
      setDialogOpen(false)
      setNewLoc({
        name: '',
        code: '',
        address: '',
        city: 'Phnom Penh',
        timezone: 'Asia/Phnom_Penh',
        isPickupDefault: false,
      })
      refetch()
    },
    onError: (err: any) => toast.error(err.message),
  })

  return (
    <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Fulfillment & Pickup Locations
            </h1>
            <Badge variant="secondary" className="font-semibold text-xs">
              {locations?.length ?? 0} Hubs
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Physical branches, warehouses, and depots where units are stationed and customer handovers occur.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Location Hub
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 py-12 text-center text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-600" />
            Loading logistics hubs...
          </div>
        ) : (
          locations?.map((loc: any) => (
            <Card key={loc.id} className="border-border hover:border-emerald-500/30 transition shadow-2xs">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
                    {loc.code}
                  </span>
                  {loc.isPickupDefault && (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-500/20 text-[10px]">
                      Default Hub
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base mt-2">{loc.name}</CardTitle>
                <CardDescription className="text-xs flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{loc.city}, Cambodia</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <p className="text-muted-foreground">{loc.address}</p>
                <div className="pt-2 border-t border-border flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <Layers className="h-3.5 w-3.5 text-emerald-600" />
                    {loc._count?.units ?? 0} Physical Units
                  </span>
                  <span className="font-mono text-[11px]">{loc.timezone}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Location Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Logistics Location</DialogTitle>
            <DialogDescription>
              Register a warehouse or regional depot for physical equipment dispatch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-foreground">Hub Name</label>
              <Input
                value={newLoc.name}
                onChange={(e) => setNewLoc({ ...newLoc, name: e.target.value })}
                placeholder="e.g. Battambang Regional Depot"
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground">Location Code</label>
                <Input
                  value={newLoc.code}
                  onChange={(e) => setNewLoc({ ...newLoc, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. BTM-01"
                  className="mt-1 font-mono uppercase text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground">City</label>
                <Input
                  value={newLoc.city}
                  onChange={(e) => setNewLoc({ ...newLoc, city: e.target.value })}
                  placeholder="Battambang"
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground">Full Physical Address</label>
              <Input
                value={newLoc.address}
                onChange={(e) => setNewLoc({ ...newLoc, address: e.target.value })}
                placeholder="Street 101, Sangkat..."
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground">Timezone</label>
              <Input
                value={newLoc.timezone}
                onChange={(e) => setNewLoc({ ...newLoc, timezone: e.target.value })}
                className="mt-1 font-mono text-xs"
                disabled
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addLocationMutation.mutate(newLoc)}
              disabled={addLocationMutation.isPending || !newLoc.name || !newLoc.code}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Add Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
