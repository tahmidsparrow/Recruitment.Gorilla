import { useState } from 'react';
import { Badge, Button, Card, Form, Modal, Spinner, Table } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import {
  createUser,
  getUsers,
  resetUserPassword,
  updateUser,
} from '../services/api';
import { useToast } from '../components/ToastStack';
import { ALL_ROLES, type Role, type UserListItem } from '../types';

const roleVariant: Record<Role, string> = {
  SuperAdmin: 'danger',
  Admin: 'primary',
  Recruiter: 'info',
  Interviewer: 'secondary',
};

function errorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const message = (err.response?.data as { message?: string } | undefined)?.message;
    if (message) return message;
  }
  return fallback;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export default function UsersPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState<UserListItem | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [resetTarget, setResetTarget] = useState<UserListItem | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editing) {
        return updateUser(editing.id, { name: name.trim(), roles, isActive });
      }
      return createUser({
        name: name.trim(),
        email: email.trim(),
        roles,
        temporaryPassword,
      });
    },
    onSuccess: () => {
      void invalidate();
      addToast(editing ? 'User updated.' : 'User created.');
      setShowEdit(false);
    },
    onError: (err) =>
      setFormError(errorMessage(err, editing ? 'Could not update user.' : 'Could not create user.')),
  });

  const resetMutation = useMutation({
    mutationFn: () => resetUserPassword(resetTarget!.id, { temporaryPassword: resetPassword }),
    onSuccess: () => {
      void invalidate();
      addToast('Temporary password set. The user must change it on next login.');
      setResetTarget(null);
    },
    onError: (err) => setResetError(errorMessage(err, 'Could not reset password.')),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (u: UserListItem) =>
      updateUser(u.id, { name: u.name, roles: u.roles, isActive: !u.isActive }),
    onSuccess: (_data, u) => {
      void invalidate();
      addToast(u.isActive ? 'User deactivated.' : 'User activated.');
    },
    onError: (err) => addToast(errorMessage(err, 'Could not update user.'), 'danger'),
  });

  const openAdd = () => {
    setEditing(null);
    setName('');
    setEmail('');
    setRoles([]);
    setIsActive(true);
    setTemporaryPassword('');
    setFormError(null);
    setShowEdit(true);
  };

  const openEdit = (u: UserListItem) => {
    setEditing(u);
    setName(u.name);
    setEmail(u.email);
    setRoles(u.roles);
    setIsActive(u.isActive);
    setTemporaryPassword('');
    setFormError(null);
    setShowEdit(true);
  };

  const openReset = (u: UserListItem) => {
    setResetTarget(u);
    setResetPassword('');
    setResetError(null);
  };

  const toggleRole = (role: Role) =>
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (!editing && !email.trim()) {
      setFormError('Email is required.');
      return;
    }
    if (roles.length === 0) {
      setFormError('Select at least one role.');
      return;
    }
    if (!editing && temporaryPassword.length < 8) {
      setFormError('Temporary password must be at least 8 characters.');
      return;
    }
    saveMutation.mutate();
  };

  const submitReset = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    if (resetPassword.length < 8) {
      setResetError('Temporary password must be at least 8 characters.');
      return;
    }
    resetMutation.mutate();
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Users</h2>
        <Button onClick={openAdd}>Add user</Button>
      </div>

      <Card>
        <Card.Body>
          {isLoading ? (
            <Spinner animation="border" size="sm" />
          ) : users.length === 0 ? (
            <p className="text-muted mb-0">No users yet.</p>
          ) : (
            <Table hover responsive className="align-middle mb-0">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Roles</th>
                  <th style={{ width: 110 }}>Status</th>
                  <th style={{ width: 180 }}>Last login</th>
                  <th className="text-end" style={{ width: 260 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      {u.name}
                      {u.mustChangePassword && (
                        <Badge bg="warning" text="dark" className="ms-2">
                          Pending password
                        </Badge>
                      )}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <div className="d-flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <Badge key={r} bg={roleVariant[r]}>
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td>
                      <Badge bg={u.isActive ? 'success' : 'secondary'}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>{formatDate(u.lastLoginAt)}</td>
                    <td className="text-end">
                      <Button size="sm" variant="outline-secondary" className="me-2" onClick={() => openEdit(u)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline-secondary" className="me-2" onClick={() => openReset(u)}>
                        Reset password
                      </Button>
                      <Button
                        size="sm"
                        variant={u.isActive ? 'outline-danger' : 'outline-success'}
                        disabled={toggleActiveMutation.isPending}
                        onClick={() => toggleActiveMutation.mutate(u)}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Create / edit modal */}
      <Modal show={showEdit} onHide={() => setShowEdit(false)} centered>
        <Form onSubmit={submitForm}>
          <Modal.Header closeButton>
            <Modal.Title>{editing ? 'Edit user' : 'Add user'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {formError && <p className="text-danger small">{formError}</p>}
            <Form.Group className="mb-3">
              <Form.Label>Name <span className="required-star" aria-hidden="true">*</span></Form.Label>
              <Form.Control value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email <span className="required-star" aria-hidden="true">*</span></Form.Label>
              <Form.Control
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!editing}
              />
              {editing && <Form.Text className="text-muted">Email can't be changed.</Form.Text>}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Roles <span className="required-star" aria-hidden="true">*</span></Form.Label>
              <div className="d-flex flex-wrap gap-3">
                {ALL_ROLES.map((r) => (
                  <Form.Check
                    key={r}
                    type="checkbox"
                    id={`role-${r}`}
                    label={r}
                    checked={roles.includes(r)}
                    onChange={() => toggleRole(r)}
                  />
                ))}
              </div>
            </Form.Group>
            {!editing && (
              <Form.Group className="mb-3">
                <Form.Label>Temporary password <span className="required-star" aria-hidden="true">*</span></Form.Label>
                <Form.Control
                  value={temporaryPassword}
                  onChange={(e) => setTemporaryPassword(e.target.value)}
                  autoComplete="off"
                />
                <Form.Text className="text-muted">
                  At least 8 characters. The user must change it on first login.
                </Form.Text>
              </Form.Group>
            )}
            {editing && (
              <Form.Check
                type="checkbox"
                id="user-active"
                label="Active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEdit(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Reset password modal */}
      <Modal show={resetTarget !== null} onHide={() => setResetTarget(null)} centered>
        <Form onSubmit={submitReset}>
          <Modal.Header closeButton>
            <Modal.Title>Reset password</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {resetError && <p className="text-danger small">{resetError}</p>}
            <p className="text-muted">
              Set a temporary password for <strong>{resetTarget?.name}</strong>. They'll be required to
              change it on next login.
            </p>
            <Form.Group>
              <Form.Label>Temporary password <span className="required-star" aria-hidden="true">*</span></Form.Label>
              <Form.Control
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                autoComplete="off"
                autoFocus
              />
              <Form.Text className="text-muted">At least 8 characters.</Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setResetTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={resetMutation.isPending}>
              {resetMutation.isPending ? 'Saving…' : 'Reset password'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
