'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { History, Search, RefreshCw, Filter, ShieldCheck, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function AdminAuditPage() {
  const [entityType, setEntityType] = useState('all')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-audit', entityType],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (entityType !== 'all') params.set('entityType', entityType)
      const res = await fetch(`/api/admin/audit?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch audit events')
      return res.json()
    },
  })

  const events = data?.items || []

  return (
    <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Inventory & Catalog Audit Trail
            </h1>
            <Badge variant="secondary" className="font-semibold text-xs">
              {data?.pagination?.total ?? 0} Events
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Section 1.10 Definition of Done: Keep an audit trail of critical inventory, pricing, and publication changes.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Log
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-border">
        <span className="text-xs font-semibold text-muted-foreground">Filter Entity:</span>
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="h-8 px-2 text-xs rounded-md border border-input bg-background font-medium"
        >
          <option value="all">All Entities</option>
          <option value="LISTING">Listings</option>
          <option value="UNIT">Physical Units</option>
          <option value="INTERVAL">Maintenance Intervals</option>
        </select>
      </div>

      {/* Audit List */}
      <Card className="border-border">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {isLoading ? (
              <div className="p-12 text-center text-xs text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-600" />
                Loading audit log records...
              </div>
            ) : events.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground">
                No audit events recorded for this selection.
              </div>
            ) : (
              events.map((evt: any) => (
                <div key={evt.id} className="p-4 text-xs flex flex-col gap-1.5 hover:bg-muted/30 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[11px] font-semibold">
                        {evt.action}
                      </Badge>
                      <span className="font-bold text-foreground">
                        {evt.entityType} {evt.listing?.code ? `(${evt.listing.code})` : `#${evt.entityId.slice(0, 8)}`}
                      </span>
                      {evt.listing && (
                        <span className="text-muted-foreground truncate max-w-xs">
                          — {evt.listing.name}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                      {new Date(evt.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {evt.afterJson && (
                    <div className="rounded-md bg-slate-100 dark:bg-slate-800 p-2 font-mono text-[11px] text-slate-700 dark:text-slate-300 break-all">
                      {evt.afterJson}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>Logged by: <strong className="text-foreground">{evt.actorName}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
