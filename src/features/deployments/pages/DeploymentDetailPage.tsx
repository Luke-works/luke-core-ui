import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Trash2, FileCode, Eye, X, AlertTriangle, Rocket, Hash, FileText, Globe, Building2, Clock } from 'lucide-react';
import { toast } from 'sonner';

import DetailPanel from '@/shared/ui/DetailPanel';
import Card from '@/shared/ui/Card';
import Button from '@/shared/ui/Button';
import Badge from '@/shared/ui/Badge';
import Skeleton from '@/shared/ui/Skeleton';
import BpmnViewer from '@/shared/bpmn/BpmnViewer';
import {
  getDeploymentById,
  getDeploymentResources,
  getDeploymentResourceData,
  deleteDeployment,
} from '@/features/deployments/api/endpoints';
import { api } from '@/shared/api/client';
import { absoluteTime } from '@/shared/utils/date';

export default function DeploymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'diagram' | 'xml'>('diagram');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cascade, setCascade] = useState(true);

  const { data: deployment, isLoading: depLoading } = useQuery({
    queryKey: ['deployment', id],
    queryFn: () => getDeploymentById(id!),
    enabled: !!id,
  });

  const { data: resources, isLoading: resLoading } = useQuery({
    queryKey: ['deploymentResources', id],
    queryFn: () => getDeploymentResources(id!),
    enabled: !!id,
  });

  const bpmnResource = resources?.find((r) => r.name.endsWith('.bpmn') || r.name.endsWith('.bpmn20.xml'));
  const activeResourceId = selectedResource ?? bpmnResource?.id ?? resources?.[0]?.id;
  const activeResource = resources?.find((r) => r.id === activeResourceId);

  const { data: resourceData } = useQuery({
    queryKey: ['deploymentResourceData', id, activeResourceId],
    queryFn: () => getDeploymentResourceData(id!, activeResourceId!),
    enabled: !!id && !!activeResourceId,
  });

  const isBpmn = activeResource?.name.endsWith('.bpmn') || activeResource?.name.endsWith('.bpmn20.xml');

  const deleteMutation = useMutation({
    mutationFn: () => deleteDeployment(id!, cascade),
    onSuccess: () => {
      toast.success('Deployment deleted');
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      navigate('/deployments');
    },
    onError: () => toast.error('Failed to delete deployment'),
  });

  const handleDownload = async () => {
    if (!activeResource || !id) return;
    try {
      // Use the shared client so the download inherits Basic auth + the shared 401
      // logout/redirect flow instead of re-encoding credentials by hand (#31).
      const { data: blob } = await api.get<Blob>(
        `/deployment/${id}/resources/${activeResource.id}/data`,
        { responseType: 'blob' },
      );
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = activeResource.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error('Failed to download resource');
    }
  };

  if (depLoading || !deployment) {
    return (
      <div>
        <Skeleton width="40%" height="1.5rem" />
        <Skeleton height="200px" className="mt-4" />
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 68px)', overflow: 'hidden' }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm shrink-0" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 0 }}>
        <button className="bg-transparent border-none cursor-pointer p-0" style={{ color: 'var(--accent-blue)' }} onClick={() => navigate('/dashboard')}>Dashboard</button>
        <span style={{ color: 'var(--text-muted)' }}>&raquo;</span>
        <button className="bg-transparent border-none cursor-pointer p-0" style={{ color: 'var(--accent-blue)' }} onClick={() => navigate('/deployments')}>Deployments</button>
        <span style={{ color: 'var(--text-muted)' }}>&raquo;</span>
        <span style={{ color: 'var(--text-primary)' }}>{deployment.name}</span>
      </div>

      {/* Deployment details */}
      <DetailPanel
        title="Deployment Details"
        icon={Rocket}
        defaultOpen={false}
        items={[
          { label: 'Deployment ID', value: deployment.id, icon: Hash },
          { label: 'Name', value: deployment.name, icon: FileText },
          { label: 'Source', value: deployment.source ?? 'null', icon: Globe, muted: !deployment.source },
          { label: 'Tenant ID', value: deployment.tenantId ?? 'null', icon: Building2, muted: !deployment.tenantId },
          { label: 'Deploy Time', value: absoluteTime(deployment.deploymentTime), icon: Clock },
        ]}
      />

      {/* Resources list */}
      <Card className="mb-2 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Resources ({resources?.length ?? 0})
          </h3>
          <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>
            <Trash2 size={13} className="mr-1" /> Delete Deployment
          </Button>
        </div>

        {resLoading ? (
          <Skeleton height="40px" />
        ) : (
          <div className="space-y-1">
            {resources?.map((res) => {
              const isActive = res.id === activeResourceId;
              const isBpmnFile = res.name.endsWith('.bpmn') || res.name.endsWith('.bpmn20.xml');
              return (
                <div
                  key={res.id}
                  className="flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors"
                  style={{
                    backgroundColor: isActive ? 'var(--bg-elevated)' : 'transparent',
                    border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                  }}
                  onClick={() => { setSelectedResource(res.id); setViewMode('diagram'); }}
                >
                  <div className="flex items-center gap-2">
                    <FileCode size={15} style={{ color: isBpmnFile ? 'var(--accent-blue)' : 'var(--text-muted)' }} />
                    <span className="text-sm" style={{ color: isActive ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                      {res.name}
                    </span>
                    {isBpmnFile && <Badge variant="info">BPMN</Badge>}
                  </div>
                  {isActive && (
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDownload(); }}>
                      <Download size={13} className="mr-1" /> Download
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Resource preview — fills remaining space */}
      {activeResource && resourceData && (
        <Card className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {activeResource.name}
              </h3>
              <Button variant="ghost" size="sm" onClick={handleDownload}>
                <Download size={13} className="mr-1" /> Download
              </Button>
            </div>
            {isBpmn && (
              <div className="flex items-center gap-0" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <button
                  className="px-3 py-1.5 text-xs font-medium cursor-pointer border-none"
                  style={{
                    backgroundColor: viewMode === 'diagram' ? 'var(--accent-blue)' : 'transparent',
                    color: viewMode === 'diagram' ? '#fff' : 'var(--text-secondary)',
                  }}
                  onClick={() => setViewMode('diagram')}
                >
                  <Eye size={12} className="inline mr-1" />Diagram
                </button>
                <button
                  className="px-3 py-1.5 text-xs font-medium cursor-pointer border-none"
                  style={{
                    backgroundColor: viewMode === 'xml' ? 'var(--accent-blue)' : 'transparent',
                    color: viewMode === 'xml' ? '#fff' : 'var(--text-secondary)',
                  }}
                  onClick={() => setViewMode('xml')}
                >
                  <FileCode size={12} className="inline mr-1" />XML
                </button>
              </div>
            )}
          </div>

          {isBpmn && viewMode === 'diagram' ? (
            <div className="flex-1 min-h-0" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <BpmnViewer xml={resourceData} height="100%" />
            </div>
          ) : (
            <pre
              className="text-xs overflow-auto p-4 rounded-md flex-1 min-h-0"
              style={{
                backgroundColor: 'var(--bg-base)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {resourceData}
            </pre>
          )}
        </Card>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setShowDeleteModal(false)}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative rounded-lg border shadow-xl w-full max-w-md mx-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} style={{ color: 'var(--accent-red)' }} />
                <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Delete Deployment
                </h2>
              </div>
              <button
                className="rounded p-1 cursor-pointer bg-transparent border-none"
                style={{ color: 'var(--text-secondary)' }}
                onClick={() => setShowDeleteModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Are you sure you want to delete deployment <strong style={{ color: 'var(--text-primary)' }}>{deployment.name}</strong>?
              </p>

              {/* Cascade option */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cascade}
                  onChange={(e) => setCascade(e.target.checked)}
                  className="mt-0.5"
                  style={{ accentColor: 'var(--accent-red)' }}
                />
                <div>
                  <span className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Cascade delete
                  </span>
                  <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>
                    Also delete all related process definitions, running instances, historic data, and jobs.
                  </span>
                </div>
              </label>

              {!cascade && (
                <div
                  className="flex items-start gap-2 px-3 py-2 rounded-md text-xs"
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    color: 'var(--accent-amber, #f59e0b)',
                  }}
                >
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>Without cascade, deletion will fail if running process instances exist for this deployment.</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3" style={{ borderTop: '1px solid var(--border)' }}>
              <Button variant="secondary" size="sm" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => { setShowDeleteModal(false); deleteMutation.mutate(); }}
                disabled={deleteMutation.isPending}
              >
                <Trash2 size={13} className="mr-1" />
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
