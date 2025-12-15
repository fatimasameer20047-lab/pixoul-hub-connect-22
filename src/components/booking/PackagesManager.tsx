import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useStaff } from '@/contexts/StaffContext';

type DbPackageRow = {
  id: string;
  group_key: string;
  group_title: string;
  group_subtitle: string | null;
  package_name: string;
  option_label: string;
  duration_hours: number;
  price: number;
  description: string | null;
  is_active: boolean;
  sort_order: number;
};

type EditablePackage = Omit<DbPackageRow, 'id'> & { id?: string };

const defaultForm: EditablePackage = {
  id: undefined,
  group_key: '',
  group_title: '',
  group_subtitle: '',
  package_name: '',
  option_label: '',
  duration_hours: 1,
  price: 0,
  description: '',
  is_active: true,
  sort_order: 0,
};

export function PackagesManager() {
  const { toast } = useToast();
  const { canManageRooms } = useStaff();
  const [packages, setPackages] = useState<DbPackageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<EditablePackage>(defaultForm);

  const loadPackages = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('booking_packages')
      .select('*')
      .order('group_key', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error) {
      toast({
        title: 'Unable to load packages',
        description: error.message,
        variant: 'destructive',
      });
      setPackages([]);
    } else {
      setPackages((data as DbPackageRow[]) || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const groupedPackages = useMemo(() => {
    return packages.reduce<Record<string, DbPackageRow[]>>((acc, row) => {
      if (!acc[row.group_key]) acc[row.group_key] = [];
      acc[row.group_key].push(row);
      return acc;
    }, {});
  }, [packages]);

  const resetForm = () => setEditing(defaultForm);

  const handleEdit = (row: DbPackageRow) => {
    setEditing({
      ...row,
      group_subtitle: row.group_subtitle ?? '',
      description: row.description ?? '',
    });
  };

  const handleDelete = async (id: string) => {
    if (!canManageRooms) return;
    const confirmed = window.confirm('Delete this package option?');
    if (!confirmed) return;
    const { error } = await supabase.from('booking_packages').delete().eq('id', id);
    if (error) {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Package option deleted' });
    loadPackages();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageRooms) return;
    setSaving(true);

    const payload = {
      group_key: editing.group_key.trim(),
      group_title: editing.group_title.trim(),
      group_subtitle: editing.group_subtitle?.trim() || '',
      package_name: editing.package_name.trim(),
      option_label: editing.option_label.trim(),
      duration_hours: Number(editing.duration_hours) || 1,
      price: Number(editing.price) || 0,
      description: editing.description?.trim() || '',
      is_active: editing.is_active,
      sort_order: Number(editing.sort_order) || 0,
    };

    try {
      if (editing.id) {
        const { error } = await supabase
          .from('booking_packages')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Package updated' });
      } else {
        const { error } = await supabase.from('booking_packages').insert(payload);
        if (error) throw error;
        toast({ title: 'Package added' });
      }
      resetForm();
      loadPackages();
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Packages &amp; Offers</h2>
          <p className="text-sm text-muted-foreground">Manage package options shown to customers</p>
        </div>
        {!canManageRooms && (
          <Badge variant="secondary">View only</Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editing.id ? 'Edit Package Option' : 'Add Package Option'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Group Key</Label>
              <Input
                value={editing.group_key}
                onChange={(e) => setEditing((prev) => ({ ...prev, group_key: e.target.value }))}
                placeholder="pc-gaming"
                required
                disabled={!canManageRooms}
              />
            </div>
            <div className="space-y-2">
              <Label>Group Title</Label>
              <Input
                value={editing.group_title}
                onChange={(e) => setEditing((prev) => ({ ...prev, group_title: e.target.value }))}
                placeholder="PC Gaming"
                required
                disabled={!canManageRooms}
              />
            </div>
            <div className="space-y-2">
              <Label>Group Subtitle</Label>
              <Input
                value={editing.group_subtitle ?? ''}
                onChange={(e) => setEditing((prev) => ({ ...prev, group_subtitle: e.target.value }))}
                placeholder="Training, VIP, and Private rooms"
                disabled={!canManageRooms}
              />
            </div>
            <div className="space-y-2">
              <Label>Package Name</Label>
              <Input
                value={editing.package_name}
                onChange={(e) => setEditing((prev) => ({ ...prev, package_name: e.target.value }))}
                placeholder="Training Room"
                required
                disabled={!canManageRooms}
              />
            </div>
            <div className="space-y-2">
              <Label>Option Label</Label>
              <Input
                value={editing.option_label}
                onChange={(e) => setEditing((prev) => ({ ...prev, option_label: e.target.value }))}
                placeholder="1 Hour"
                required
                disabled={!canManageRooms}
              />
            </div>
            <div className="space-y-2">
              <Label>Duration (hours)</Label>
              <Input
                type="number"
                min={1}
                value={editing.duration_hours}
                onChange={(e) => setEditing((prev) => ({ ...prev, duration_hours: Number(e.target.value) }))}
                required
                disabled={!canManageRooms}
              />
            </div>
            <div className="space-y-2">
              <Label>Price (AED)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={editing.price}
                onChange={(e) => setEditing((prev) => ({ ...prev, price: Number(e.target.value) }))}
                required
                disabled={!canManageRooms}
              />
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={editing.sort_order}
                onChange={(e) => setEditing((prev) => ({ ...prev, sort_order: Number(e.target.value) }))}
                disabled={!canManageRooms}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={editing.description ?? ''}
                onChange={(e) => setEditing((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Short description for customers"
                rows={2}
                disabled={!canManageRooms}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="is-active"
                checked={editing.is_active}
                onCheckedChange={(checked) => setEditing((prev) => ({ ...prev, is_active: checked }))}
                disabled={!canManageRooms}
              />
              <Label htmlFor="is-active">Active (visible to customers)</Label>
            </div>
            <div className="flex flex-col md:flex-row md:justify-end gap-2 md:col-span-2">
              {editing.id && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancel edit
                </Button>
              )}
              <Button type="submit" disabled={saving || !canManageRooms}>
                {saving ? 'Saving...' : editing.id ? 'Update option' : 'Add option'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {loading && <p className="text-sm text-muted-foreground">Loading packages...</p>}
        {!loading && packages.length === 0 && (
          <p className="text-sm text-muted-foreground">No packages found. Add a package option to get started.</p>
        )}
        {!loading &&
          Object.entries(groupedPackages).map(([groupKey, rows]) => (
            <Card key={groupKey}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{rows[0]?.group_title || groupKey}</span>
                  <Badge variant="outline">{rows[0]?.group_subtitle || 'Packages'}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className="border border-border/70 rounded-lg p-3 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{row.package_name}</div>
                        <div className="text-xs text-muted-foreground">{row.option_label} • {row.duration_hours}h</div>
                      </div>
                      <Badge variant={row.is_active ? 'default' : 'secondary'}>
                        {row.is_active ? 'Active' : 'Hidden'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      AED {row.price.toFixed(2)}
                      {row.description ? ` • ${row.description}` : ''}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(row)}
                        disabled={!canManageRooms}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(row.id)}
                        disabled={!canManageRooms}
                      >
                        Delete
                      </Button>
                      <Button
                        variant={row.is_active ? 'secondary' : 'default'}
                        size="sm"
                        onClick={async () => {
                          if (!canManageRooms) return;
                          const { error } = await supabase
                            .from('booking_packages')
                            .update({ is_active: !row.is_active })
                            .eq('id', row.id);
                          if (error) {
                            toast({
                              title: 'Update failed',
                              description: error.message,
                              variant: 'destructive',
                            });
                          } else {
                            toast({ title: row.is_active ? 'Package hidden' : 'Package shown' });
                            loadPackages();
                          }
                        }}
                        disabled={!canManageRooms}
                      >
                        {row.is_active ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
