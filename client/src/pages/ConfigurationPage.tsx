import { useState } from 'react';
import { Badge, Button, Card, Form, Modal, Spinner, Table } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createRoleOption,
  createSkillOption,
  deleteRoleOption,
  deleteSkillOption,
  getRoleOptions,
  getSkillOptions,
  updateRoleOption,
  updateSkillOption,
} from '../services/api';
import { useToast } from '../components/ToastStack';
import type { UpsertOptionPayload } from '../types';

interface Opt {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

interface SectionApi {
  list: (includeInactive: boolean) => Promise<Opt[]>;
  create: (p: UpsertOptionPayload) => Promise<Opt>;
  update: (id: number, p: UpsertOptionPayload) => Promise<Opt>;
  remove: (id: number) => Promise<void>;
}

const rolesApi: SectionApi = {
  list: getRoleOptions,
  create: createRoleOption,
  update: updateRoleOption,
  remove: deleteRoleOption,
};

const skillsApi: SectionApi = {
  list: getSkillOptions,
  create: createSkillOption,
  update: updateSkillOption,
  remove: deleteSkillOption,
};

export default function ConfigurationPage() {
  return (
    <div>
      <h2 className="mb-4">Configuration</h2>
      <OptionSection title="Roles applied" noun="role" queryKey="roles" api={rolesApi} />
      <OptionSection title="Skills" noun="skill" queryKey="skills" api={skillsApi} />
    </div>
  );
}

function OptionSection({
  title,
  noun,
  queryKey,
  api,
}: {
  title: string;
  noun: string;
  queryKey: string;
  api: SectionApi;
}) {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Opt | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nameInvalid, setNameInvalid] = useState(false);

  const { data: options = [], isLoading } = useQuery({
    queryKey: ['config', queryKey, 'all'],
    queryFn: () => api.list(true),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['config'] });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: UpsertOptionPayload = { name: name.trim(), sortOrder, isActive };
      return editing ? api.update(editing.id, payload) : api.create(payload);
    },
    onSuccess: () => {
      void invalidate();
      addToast(editing ? `${noun.charAt(0).toUpperCase() + noun.slice(1)} updated.` : `${noun.charAt(0).toUpperCase() + noun.slice(1)} added.`);
      setShowModal(false);
    },
    onError: () => setError(`Could not save ${noun}. The name may already exist.`),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => api.remove(id),
    onSuccess: () => void invalidate(),
  });

  const openAdd = () => {
    setEditing(null);
    setName('');
    setSortOrder((options.at(-1)?.sortOrder ?? 0) + 1);
    setIsActive(true);
    setError(null);
    setNameInvalid(false);
    setShowModal(true);
  };

  const openEdit = (o: Opt) => {
    setEditing(o);
    setName(o.name);
    setSortOrder(o.sortOrder);
    setIsActive(o.isActive);
    setError(null);
    setNameInvalid(false);
    setShowModal(true);
  };

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <span>{title}</span>
        <Button size="sm" onClick={openAdd}>
          Add {noun}
        </Button>
      </Card.Header>
      <Card.Body>
        {isLoading ? (
          <Spinner animation="border" size="sm" />
        ) : options.length === 0 ? (
          <p className="text-muted mb-0">No {noun} values yet.</p>
        ) : (
          <Table hover responsive className="align-middle mb-0">
            <thead>
              <tr>
                <th>Name</th>
                <th style={{ width: 90 }}>Order</th>
                <th style={{ width: 110 }}>Status</th>
                <th className="text-end" style={{ width: 170 }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {options.map((o) => (
                <tr key={o.id}>
                  <td>{o.name}</td>
                  <td>{o.sortOrder}</td>
                  <td>
                    <Badge bg={o.isActive ? 'success' : 'secondary'}>
                      {o.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="text-end">
                    <Button size="sm" variant="outline-secondary" className="me-2" onClick={() => openEdit(o)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      disabled={removeMutation.isPending}
                      onClick={() => removeMutation.mutate(o.id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) {
              setNameInvalid(true);
              setError(null);
              return;
            }
            setNameInvalid(false);
            saveMutation.mutate();
          }}
        >
          <Modal.Header closeButton>
            <Modal.Title>
              {editing ? `Edit ${noun}` : `Add ${noun}`}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && <p className="text-danger small">{error}</p>}
            <Form.Group className="mb-3">
              <Form.Label>Name <span className="required-star" aria-hidden="true">*</span></Form.Label>
              <Form.Control
                value={name}
                onChange={(e) => { setName(e.target.value); if (nameInvalid) setNameInvalid(false); }}
                isInvalid={nameInvalid}
                autoFocus
              />
              <Form.Control.Feedback type="invalid">Name is required.</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Sort order</Form.Label>
              <Form.Control
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />
            </Form.Group>
            <Form.Check
              type="checkbox"
              id={`${queryKey}-active`}
              label="Active (shown in candidate forms)"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Card>
  );
}
