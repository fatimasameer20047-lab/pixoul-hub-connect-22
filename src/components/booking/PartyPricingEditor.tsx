import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useStaff } from '@/contexts/StaffContext';

type PartyPricingRow = {
  id: string;
  title: string;
  weekday_text: string;
  weekend_text: string;
};

const defaultId = 'default';

export function PartyPricingEditor() {
  const { toast } = useToast();
  const { canManageRooms } = useStaff();
  const [pricing, setPricing] = useState<PartyPricingRow>({
    id: defaultId,
    title: '',
    weekday_text: '',
    weekend_text: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadPricing = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('party_pricing_content')
      .select('*')
      .eq('id', defaultId)
      .maybeSingle();

    if (error) {
      toast({
        title: 'Unable to load party pricing',
        description: error.message,
        variant: 'destructive',
      });
    } else if (data) {
      setPricing(data as PartyPricingRow);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPricing();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageRooms) return;
    setSaving(true);
    const payload = {
      title: pricing.title.trim() || 'Birthday Bash pricing',
      weekday_text: pricing.weekday_text.trim(),
      weekend_text: pricing.weekend_text.trim(),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('party_pricing_content')
      .upsert({ id: defaultId, ...payload });
    if (error) {
      toast({
        title: 'Save failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Party pricing updated' });
      loadPricing();
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Party Pricing Text</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="party-title">Title</Label>
            <Input
              id="party-title"
              value={pricing.title}
              onChange={(e) => setPricing((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Birthday Bash pricing"
              disabled={!canManageRooms || loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="party-weekday">Weekday text</Label>
            <Input
              id="party-weekday"
              value={pricing.weekday_text}
              onChange={(e) => setPricing((prev) => ({ ...prev, weekday_text: e.target.value }))}
              placeholder="Weekdays (Mon-Thu): AED 199 / kid"
              disabled={!canManageRooms || loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="party-weekend">Weekend text</Label>
            <Input
              id="party-weekend"
              value={pricing.weekend_text}
              onChange={(e) => setPricing((prev) => ({ ...prev, weekend_text: e.target.value }))}
              placeholder="Weekends (Fri-Sun): AED 235 / kid"
              disabled={!canManageRooms || loading}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={loadPricing}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button type="submit" disabled={!canManageRooms || saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
