import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

const JoinFamily = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [invitation, setInvitation] = useState<{ id: string; family_id: string; families: { name: string }; profiles: { full_name?: string; email?: string } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (token) {
      loadInvitation();
    } else {
      setError('Invalid invitation link');
      setLoading(false);
    }
  }, [token]);

  const loadInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from('family_invitations')
        .select(`
          *,
          families (name),
          profiles!invited_by (full_name, email)
        `)
        .eq('token', token)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        setError('Invitation not found or has expired');
      } else {
        setInvitation(data);
      }
    } catch (error) {
      console.error('Error loading invitation:', error);
      setError('Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const joinFamily = async () => {
    if (!invitation) return;

    setJoining(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Redirect to auth page with return URL
        navigate(`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }

      // Check if user is already in a family
      const { data: existingMember } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        setError('You are already a member of a family. Please leave your current family first.');
        return;
      }

      // Add user to family
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_id: invitation.family_id,
          user_id: user.id,
          role: 'member',
        });

      if (memberError) throw memberError;

      // Mark invitation as used
      const { error: updateError } = await supabase
        .from('family_invitations')
        .update({ used_at: new Date().toISOString() })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      toast({
        title: "Welcome to the family!",
        description: `You have successfully joined ${invitation.families.name}`,
      });

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error joining family:', error);
      toast({
        title: "Error",
        description: "Failed to join family. Please try again.",
        variant: "destructive",
      });
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate('/dashboard')} variant="outline">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Users className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle>Family Invitation</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div>
            <p className="text-muted-foreground mb-2">You've been invited to join</p>
            <h3 className="text-xl font-semibold">{invitation?.families.name}</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Invited by {invitation?.profiles.full_name || invitation?.profiles.email}
            </p>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg text-left">
            <h4 className="font-medium mb-2">As a family member, you can:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✅ View and manage shared products</li>
              <li>✅ Get expiry and warranty notifications</li>
              <li>✅ Add products for the whole family</li>
              <li>✅ Collaborate on shopping lists</li>
            </ul>
          </div>

          <Button
            onClick={joinFamily}
            disabled={joining}
            className="w-full"
            size="lg"
          >
            {joining ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Joining...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Join Family
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            By joining, you agree to share household product data with family members.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinFamily;