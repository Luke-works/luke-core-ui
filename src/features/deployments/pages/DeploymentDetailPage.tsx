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
      <div className="flex items-center gap-1.5 text-sm shrink-0 pb-2 border-b border-gray-200 dark:border-gray-800">
        <button className="bg-transparent border-none cursor-pointer p-0 text-brand-500 hover:underline dark:text-brand-400" onClick={() => navigate('/dashboard')}>Dashboard</button>
        <span className="text-gray-400 dark:text-gray-500">&raquo;</span>
        <button className="bg-transparent border-none cursor-pointer p-0 text-brand-500 hover:underline dark:text-brand-400" onClick={() => navigate('/deployments')}>Deployments</button>
        <span className="text-gray-400 dark:text-gray-500">&raquo;</span>
        <span className="text-gray-800 dark:text-white/90">{deployment.name}</span>
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
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
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
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors border ${
                    isActive
                      ? 'bg-gray-50 border-gray-200 dark:bg-white/[0.03] dark:border-gray-800'
                      : 'border-transparent hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                  }`}
                  onClick={() => { setSelectedResource(res.id); setViewMode('diagram'); }}
                >
                  <div className="flex items-center gap-2">
                    <FileCode size={15} className={isBpmnFile ? 'text-brand-500 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'} />
                    <span className={`text-sm ${isActive ? 'text-brand-500 dark:text-brand-400' : 'text-gray-800 dark:text-white/90'}`}>
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
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                {activeResource.name}
              </h3>
              <Button variant="ghost" size="sm" onClick={handleDownload}>
                <Download size={13} className="mr-1" /> Download
              </Button>
            </div>
            {isBpmn && (
              <div className="flex items-center gap-0 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
                <button
                  className={`px-3 py-1.5 text-xs font-medium cursor-pointer border-none transition-colors ${
                    viewMode === 'diagram'
                      ? 'bg-brand-500 text-white'
                      : 'bg-transparent text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.03]'
                  }`}
                  onClick={() => setViewMode('diagram')}
                >
                  <Eye size={12} className="inline mr-1" />Diagram
                </button>
                <button
                  className={`px-3 py-1.5 text-xs font-medium cursor-pointer border-none transition-colors ${
                    viewMode === 'xml'
                      ? 'bg-brand-500 text-white'
                      : 'bg-transparent text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.03]'
                  }`}
                  onClick={() => setViewMode('xml')}
                >
                  <FileCode size={12} className="inline mr-1" />XML
                </button>
              </div>
            )}
          </div>

          {isBpmn && viewMode === 'diagram' ? (
            <div className="flex-1 min-h-0 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
              <BpmnViewer xml={resourceData} height="100%" />
            </div>
          ) : (
            <pre
              className="text-xs overflow-auto p-4 rounded-lg flex-1 min-h-0 bg-gray-50 text-gray-800 border border-gray-200 dark:bg-gray-950 dark:text-gray-200 dark:border-gray-800"
              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
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
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px]" />
          <div
            className="relative rounded-2xl border border-gray-200 bg-white shadow-theme-xl w-full max-w-md mx-4 dark:border-gray-800 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-error-500 dark:text-error-400" />
                <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
                  Delete Deployment
                </h2>
              </div>
              <button
                className="flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.05] dark:hover:text-white transition-colors"
                onClick={() => setShowDeleteModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Are you sure you want to delete deployment <strong className="text-gray-800 dark:text-white/90">{deployment.name}</strong>?
              </p>

              {/* Cascade option */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cascade}
                  onChange={(e) => setCascade(e.target.checked)}
                  className="mt-0.5 accent-error-500"
                />
                <div>
                  <span className="block text-sm font-medium text-gray-800 dark:text-white/90">
                    Cascade delete
                  </span>
                  <span className="block text-xs text-gray-400 dark:text-gray-500">
                    Also delete all related process definitions, running instances, historic data, and jobs.
                  </span>
                </div>
              </label>

              {!cascade && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs text-warning-600 bg-warning-50 border border-warning-200 dark:text-warning-400 dark:bg-warning-500/10 dark:border-warning-500/25">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>Without cascade, deletion will fail if running process instances exist for this deployment.</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-800">
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
