import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Heart, MessageCircle, MoreVertical, Eye, EyeOff, Edit, Trash2, Globe, Lock } from 'lucide-react';

interface Photo {
  id: string;
  url: string;
  caption: string;
  visibility: 'private' | 'pending' | 'public';
  created_at: string;
  user_id: string;
  author_name?: string;
  user_has_liked?: boolean;
}

interface PhotoCardProps {
  photo: Photo;
  isOwner?: boolean;
  likeCount?: number;
  commentCount?: number;
  showLikeCommentUI?: boolean;
  showInlineLike?: boolean;
  onPhotoClick: () => void;
  onDelete?: (photoId: string) => void;
  onEdit?: (photoId: string) => void;
  onChangeVisibility?: (photoId: string, newVisibility: 'private' | 'public') => void;
  onLike?: () => void;
}

export default function PhotoCard({ 
  photo, 
  isOwner = false, 
  likeCount = 0, 
  commentCount = 0,
  showLikeCommentUI = false,
  showInlineLike = false,
  onPhotoClick,
  onDelete,
  onEdit,
  onChangeVisibility,
  onLike
}: PhotoCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDelete = () => {
    if (onDelete) {
      onDelete(photo.id);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <Card className="overflow-hidden group hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        {/* Image uses natural aspect; width-fitted */}
        <div 
          className={`w-full bg-muted overflow-hidden cursor-pointer`}
          onClick={onPhotoClick}
        >
          <img 
            src={photo.url} 
            alt={photo.caption || "Gallery photo"} 
            className="w-full h-auto group-hover:scale-[1.01] transition-transform duration-200"
            loading="lazy"
            decoding="async"
          />
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Author name for community posts */}
          {photo.author_name && (
            <p className="text-xs text-muted-foreground">
              {photo.author_name} posted this
            </p>
          )}

          {/* Caption */}
          {photo.caption && (
            <p className="text-sm line-clamp-2">{photo.caption}</p>
          )}

          {/* Stats and Actions */}
          <div className="flex items-center justify-between">
            {showLikeCommentUI ? (
              <div className="flex items-center gap-3">
                {showInlineLike && onLike ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 text-sm text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLike();
                    }}
                  >
                    <Heart className={`h-4 w-4 mr-1 ${photo.user_has_liked ? 'fill-current text-red-500' : ''}`} />
                    <span>{likeCount}</span>
                  </Button>
                ) : (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Heart className="h-4 w-4" />
                    <span>{likeCount}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MessageCircle className="h-4 w-4" />
                  <span>{commentCount}</span>
                </div>
              </div>
            ) : (
              <div></div>
            )}

            <div className="flex items-center gap-2">
              {/* Visibility badge */}
              {photo.visibility === 'public' && (
                <Badge variant="default" className="text-xs">
                  <Eye className="h-3 w-3 mr-1" /> Public
                </Badge>
              )}
              {photo.visibility === 'private' && (
                <Badge variant="secondary" className="text-xs">
                  <EyeOff className="h-3 w-3 mr-1" /> Private
                </Badge>
              )}
              {photo.visibility === 'pending' && (
                <Badge variant="secondary" className="text-xs">
                  <Eye className="h-3 w-3 mr-1" /> Pending approval
                </Badge>
              )}

              {/* Owner actions */}
              {isOwner && (onDelete || onEdit || onChangeVisibility) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(photo.id)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Caption
                      </DropdownMenuItem>
                    )}
                    {onChangeVisibility && photo.visibility === 'private' && (
                      <DropdownMenuItem onClick={() => onChangeVisibility(photo.id, 'public')}>
                        <Globe className="h-4 w-4 mr-2" />
                        Submit for Approval
                      </DropdownMenuItem>
                    )}
                    {photo.visibility === 'pending' && (
                      <DropdownMenuItem disabled>
                        <Globe className="h-4 w-4 mr-2" />
                        Awaiting staff review
                      </DropdownMenuItem>
                    )}
                    {onChangeVisibility && photo.visibility === 'public' && (
                      <DropdownMenuItem onClick={() => onChangeVisibility(photo.id, 'private')}>
                        <Lock className="h-4 w-4 mr-2" />
                        Make Private
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem 
                        onClick={() => setIsDeleteDialogOpen(true)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Date */}
          <div className="text-xs text-muted-foreground">
            {new Date(photo.created_at).toLocaleDateString()}
          </div>
        </div>
      </CardContent>

      {/* Delete confirmation dialog */}
      {onDelete && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Photo</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this photo? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
}
