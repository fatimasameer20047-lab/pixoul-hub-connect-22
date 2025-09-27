import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Pin, Calendar, User } from 'lucide-react';

const announcements = [
  {
    id: 1,
    title: 'New WiFi Password - Updated Security',
    content: 'The WiFi password has been updated for enhanced security. Please use the new credentials provided at the front desk.',
    author: 'IT Support',
    date: '2024-01-15',
    pinned: true,
    category: 'Security'
  },
  {
    id: 2,
    title: 'Maintenance Schedule - Conference Room A',
    content: 'Conference Room A will be under maintenance on January 20th from 9 AM to 2 PM. Please book alternative rooms during this period.',
    author: 'Facilities Team',
    date: '2024-01-14',
    pinned: true,
    category: 'Maintenance'
  },
  {
    id: 3,
    title: 'New Menu Items Available',
    content: 'We have added new vegetarian and vegan options to our snacks menu. Check out the updated offerings in the cafeteria.',
    author: 'Kitchen Staff',
    date: '2024-01-12',
    pinned: false,
    category: 'Food & Beverage'
  },
  {
    id: 4,
    title: 'Extended Business Hours',
    content: 'Starting next week, our facility will be open until 10 PM on weekdays to accommodate your extended work schedules.',
    author: 'Management',
    date: '2024-01-10',
    pinned: false,
    category: 'Hours'
  }
];

export default function Announcements() {
  const pinnedAnnouncements = announcements.filter(a => a.pinned);
  const regularAnnouncements = announcements.filter(a => !a.pinned);

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
        <p className="text-muted-foreground">
          Stay updated with the latest news and important information
        </p>
      </div>

      {pinnedAnnouncements.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Pin className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Pinned Announcements</h2>
          </div>
          {pinnedAnnouncements.map((announcement) => (
            <Card key={announcement.id} className="border-primary/50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{announcement.title}</CardTitle>
                      <Pin className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{announcement.author}</span>
                      <Calendar className="h-3 w-3 ml-2" />
                      <span>{announcement.date}</span>
                    </div>
                  </div>
                  <Badge variant="secondary">{announcement.category}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{announcement.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Updates</h2>
        {regularAnnouncements.map((announcement) => (
          <Card key={announcement.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">{announcement.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{announcement.author}</span>
                    <Calendar className="h-3 w-3 ml-2" />
                    <span>{announcement.date}</span>
                  </div>
                </div>
                <Badge variant="outline">{announcement.category}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{announcement.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}