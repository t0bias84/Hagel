import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "../ui/table";
import { Button } from "../ui/button";
import { Select } from "../ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, Shield, User, UserX } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const UserManagement = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Kunde inte hämta användare");
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      setError('');
      setSuccess('');
      
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (!response.ok) throw new Error("Kunde inte uppdatera roll");
      await fetchUsers();
      setSuccess('Användarroll uppdaterad');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStatusChange = async (userId, disabled) => {
    try {
      setError('');
      setSuccess('');
      
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ disabled }),
      });
      if (!response.ok) throw new Error("Kunde inte uppdatera status");
      await fetchUsers();
      setSuccess('Användarstatus uppdaterad');
    } catch (err) {
      setError(err.message);
    }
  };

  const getPrimaryRole = (roles) => {
    if (!roles || roles.length === 0) return 'USER';
    if (roles.includes('admin')) return 'ADMIN';
    if (roles.includes('elder')) return 'ELDER';
    return 'USER';
  };

  const getRoleIcon = (roles) => {
    const primaryRole = getPrimaryRole(roles);
    switch (primaryRole) {
      case 'ADMIN':
        return <Shield className="w-4 h-4 text-red-500" />;
      case 'ELDER':
        return <Shield className="w-4 h-4 text-yellow-500" />;
      default:
        return <User className="w-4 h-4 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="container mx-auto py-6">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6" />
          {t("admin.users.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert variant="default" className="mb-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-600 dark:text-green-400">{success}</AlertDescription>
          </Alert>
        )}

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Användarnamn</TableHead>
                <TableHead className="w-[200px]">{t("admin.users.role")}</TableHead>
                <TableHead className="w-[150px]">{t("admin.users.status")}</TableHead>
                <TableHead>{t("admin.users.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(user.roles)}
                      {user.username}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={getPrimaryRole(user.roles)}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="w-full"
                    >
                      <option value="USER">{t("admin.users.roles.USER")}</option>
                      <option value="ELDER">{t("admin.users.roles.ELDER")}</option>
                      <option value="ADMIN">{t("admin.users.roles.ADMIN")}</option>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                      !user.disabled 
                        ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                        : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {!user.disabled ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <UserX className="w-4 h-4" />
                      )}
                      {!user.disabled ? "Aktiv" : "Inaktiv"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      onClick={() => handleStatusChange(user.id, !user.disabled)}
                      variant={!user.disabled ? "destructive" : "default"}
                      size="sm"
                      className="w-[120px]"
                    >
                      {!user.disabled
                        ? t("admin.users.deactivate")
                        : t("admin.users.activate")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserManagement; 