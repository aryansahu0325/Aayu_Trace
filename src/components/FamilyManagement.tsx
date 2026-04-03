import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Users, UserPlus, Crown, Shield, User, Copy, Trash2, Mail } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FamilyMember {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  family_id: string;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
}

interface Family {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

interface FamilyInvitation {
  id: string;
  email: string;
  token: string;
  expires_at: string;
  created_at: string;
}

const FamilyManagement = () => {
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [invitations, setInvitations] = useState<FamilyInvitation[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadFamilyData();
  }, []);

  const loadFamilyData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user is part of a family
      const { data: memberData } = await supabase
        .from('family_members')
        .select(`
          *,
          families (*)
        `)
        .eq('user_id', user.id)
        .single();

      if (memberData) {
        setFamily(memberData.families);
        setUserRole(memberData.role);
        
        // Load all family members
        const { data: familyMembers } = await supabase
          .from('family_members')
          .select(`
            id,
            user_id,
            role,
            joined_at,
            family_id
          `)
          .eq('family_id', memberData.family_id);

        if (familyMembers) {
          // Load profiles separately to avoid relation issues
          const userIds = familyMembers.map(m => m.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, email')
            .in('user_id', userIds);

          // Combine the data
          const membersWithProfiles = familyMembers.map(member => ({
            ...member,
            profiles: profiles?.find(p => p.user_id === member.user_id) || null
          }));

          setMembers(membersWithProfiles);
        }

        // Load pending invitations (only for owners/admins)
        if (['owner', 'admin'].includes(memberData.role)) {
          const { data: pendingInvites } = await supabase
            .from('family_invitations')
            .select('*')
            .eq('family_id', memberData.family_id)
            .is('used_at', null)
            .gt('expires_at', new Date().toISOString());

          setInvitations(pendingInvites || []);
        }
      }
    } catch (error) {
      console.error('Error loading family data:', error);
      toast({
        title: "Error",
        description: "Failed to load family data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createFamily = async () => {
    if (!familyName.trim()) return;

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create family
      const { data: newFamily, error: familyError } = await supabase
        .from('families')
        .insert({
          name: familyName,
          created_by: user.id,
        })
        .select()
        .single();

      if (familyError) throw familyError;

      // Add creator as owner
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_id: newFamily.id,
          user_id: user.id,
          role: 'owner',
        });

      if (memberError) throw memberError;

      setFamily(newFamily);
      setUserRole('owner');
      setIsCreateDialogOpen(false);
      setFamilyName('');
      loadFamilyData();

      toast({
        title: "Family Created",
        description: `"${newFamily.name}" family has been created successfully!`,
      });
    } catch (error) {
      console.error('Error creating family:', error);
      toast({
        title: "Error",
        description: "Failed to create family",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const sendInvitation = async () => {
    if (!inviteEmail.trim() || !family) return;

    setIsInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-family-invitation', {
        body: {
          email: inviteEmail,
          familyId: family.id,
          familyName: family.name,
        },
      });

      if (error) throw error;

      setIsInviteDialogOpen(false);
      setInviteEmail('');
      loadFamilyData();

      toast({
        title: "Invitation Sent",
        description: `Invitation has been sent to ${inviteEmail}`,
      });
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: "Error", 
        description: "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  const copyInvitationLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/join-family?token=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    toast({
      title: "Link Copied",
      description: "Invitation link copied to clipboard",
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Loading family data...</p>
        </div>
      </div>
    );
  }

  if (!family) {
    return (
      <Card>
        <CardHeader className="text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <CardTitle>Family Sharing</CardTitle>
          <p className="text-muted-foreground">
            Create or join a family to share household products and never miss expiry dates together.
          </p>
        </CardHeader>
        <CardContent className="text-center">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Users className="h-4 w-4 mr-2" />
                Create Family
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Family</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="familyName">Family Name</Label>
                  <Input
                    id="familyName"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    placeholder="e.g., The Smith Family"
                  />
                </div>
                <Button
                  onClick={createFamily}
                  disabled={!familyName.trim() || isCreating}
                  className="w-full"
                >
                  {isCreating ? 'Creating...' : 'Create Family'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {family.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {members.length} member{members.length !== 1 ? 's' : ''}
              </p>
            </div>
            {['owner', 'admin'].includes(userRole) && (
              <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Family Member</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="inviteEmail">Email Address</Label>
                      <Input
                        id="inviteEmail"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="member@example.com"
                      />
                    </div>
                    <Button
                      onClick={sendInvitation}
                      disabled={!inviteEmail.trim() || isInviting}
                      className="w-full"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {isInviting ? 'Sending...' : 'Send Invitation'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getRoleIcon(member.role)}
                    <div>
                      <p className="font-medium">
                        {member.profiles?.full_name || 'Unknown User'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {member.profiles?.email}
                      </p>
                    </div>
                  </div>
                </div>
                <Badge className={getRoleBadgeColor(member.role)}>
                  {member.role}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {invitations.length > 0 && ['owner', 'admin'].includes(userRole) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{invitation.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Expires {new Date(invitation.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyInvitationLink(invitation.token)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FamilyManagement;