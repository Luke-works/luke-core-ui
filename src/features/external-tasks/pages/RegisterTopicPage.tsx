import { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, ChevronLeft, Check, ArrowLeft, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

import Button from '@/shared/ui/Button';
import Card from '@/shared/ui/Card';
import Tooltip from '@/shared/ui/Tooltip';
import { createRegisteredTopic, type RegisteredTopic } from '@/features/external-tasks/api/topicRegistry';
import { useAuthStore } from '@/features/auth/stores/authStore';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

/* ── Constants ───────────────────────────────────────────────── */

/* ── Worker type SVG icons ────────────────────────────────────── */

function JavaIcon({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M8.851 18.56s-.917.534.653.714c1.902.218 2.874.187 4.969-.211 0 0 .552.346 1.321.646-4.699 2.013-10.633-.118-6.943-1.149M8.276 15.933s-1.028.762.542.924c2.032.209 3.636.227 6.413-.308 0 0 .384.389.987.602-5.679 1.661-12.007.13-7.942-.1218M13.116 11.475c1.158 1.333-.304 2.533-.304 2.533s2.939-1.518 1.589-3.418c-1.261-1.772-2.228-2.652 3.007-5.688 0 0-8.216 2.051-4.292 6.573M19.33 20.504s.679.559-.747.991c-2.712.822-11.288 1.069-13.669.033-.856-.373.75-.89 1.254-.998.527-.114.828-.093.828-.093-.953-.671-6.156 1.317-2.643 1.887 9.58 1.553 17.462-.7 14.977-1.82M9.292 13.21s-4.362 1.036-1.544 1.412c1.189.159 3.561.123 5.77-.062 1.806-.152 3.618-.477 3.618-.477s-.637.272-1.098.587c-4.429 1.165-12.986.623-10.522-.568 2.082-1.006 3.776-.892 3.776-.892M17.116 17.584c4.503-2.34 2.421-4.589.968-4.285-.356.075-.515.14-.515.14s.132-.207.385-.297c2.875-1.011 5.086 2.981-.929 4.562 0 0 .07-.062.091-.12M14.401 0s2.494 2.494-2.365 6.33c-3.896 3.077-.889 4.832 0 6.836-2.274-2.053-3.943-3.858-2.824-5.539 1.644-2.469 6.197-3.665 5.189-7.627M9.734 23.924c4.322.277 10.959-.154 11.116-2.198 0 0-.302.775-3.572 1.391-3.688.694-8.239.613-10.937.168 0 0 .553.457 3.393.639"/></svg>;
}
function PythonIcon({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M11.914 0C5.82 0 6.2 2.656 6.2 2.656l.007 2.752h5.814v.826H3.9S0 5.789 0 11.969c0 6.18 3.403 5.96 3.403 5.96h2.03v-2.867s-.109-3.403 3.35-3.403h5.766s3.24.052 3.24-3.134V3.16S18.28 0 11.914 0zM8.708 1.85c.578 0 1.046.468 1.046 1.046 0 .578-.468 1.046-1.046 1.046-.578 0-1.046-.468-1.046-1.046 0-.578.468-1.046 1.046-1.046z"/><path d="M12.086 24c6.094 0 5.714-2.656 5.714-2.656l-.007-2.752h-5.814v-.826h8.121S24 18.211 24 12.031c0-6.18-3.403-5.96-3.403-5.96h-2.03v2.867s.109 3.403-3.35 3.403H9.451s-3.24-.052-3.24 3.134v5.365S5.72 24 12.086 24zm3.206-1.85c-.578 0-1.046-.468-1.046-1.046 0-.578.468-1.046 1.046-1.046.578 0 1.046.468 1.046 1.046 0 .578-.468 1.046-1.046 1.046z"/></svg>;
}
function JsIcon({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M0 0h24v24H0V0zm22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.42-.405-.6-.586-.78-.63-.705-1.469-1.065-2.834-1.034l-.705.089c-.676.165-1.32.525-1.71 1.005-1.14 1.291-.811 3.541.569 4.471 1.365 1.02 3.361 1.244 3.616 2.205.24 1.17-.87 1.545-1.966 1.41-.811-.18-1.26-.586-1.755-1.336l-1.83 1.051c.21.48.45.689.81 1.109 1.74 1.756 6.09 1.666 6.871-1.004.029-.09.24-.705.074-1.65l.046.067zm-8.983-7.245h-2.248c0 1.938-.009 3.864-.009 5.805 0 1.232.063 2.363-.138 2.711-.33.689-1.18.601-1.566.48-.396-.196-.597-.466-.83-.855-.063-.105-.11-.196-.127-.196l-1.825 1.125c.305.63.75 1.172 1.324 1.517.855.51 2.004.675 3.207.405.783-.226 1.458-.691 1.811-1.411.51-.93.402-2.07.397-3.346.012-2.054 0-4.109 0-6.179l.004-.056z"/></svg>;
}
function GroovyIcon({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-1 1-4-4 4-4 1 1-3 3 3 3zm2-2l1-1 4 4-4 4-1-1 3-3-3-3zm-2-4h2v2h-2v-2z"/></svg>;
}
function CsharpIcon({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm-.5 3.5h1v2h2v1h-2v2h-1v-2h-2v-1h2v-2zm-4.3 4.9h1.6l.5 1.6h2.5l.5-1.6h1.6l-2.5 7.2H9.7l-2.5-7.2zm8.3 0h1.6l.5 1.6h2.5l.5-1.6h1.6l-2.5 7.2h-1.7l-2.5-7.2z"/></svg>;
}
function GoIcon({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M1.811 10.231c-.047 0-.058-.023-.035-.059l.246-.315c.023-.035.081-.058.128-.058h4.172c.046 0 .058.035.035.07l-.199.303c-.023.036-.082.07-.117.07zM.047 11.306c-.047 0-.059-.023-.035-.058l.245-.316c.023-.035.082-.058.129-.058h5.328c.047 0 .07.035.058.07l-.093.28c-.012.047-.058.07-.105.07zm2.828 1.075c-.047 0-.059-.035-.035-.07l.163-.292c.023-.035.07-.07.117-.07h2.337c.047 0 .07.035.07.082l-.023.28c0 .047-.047.082-.082.082zm12.129-2.36c-.736.187-1.239.327-1.963.514-.176.046-.187.058-.34-.117-.174-.199-.303-.327-.548-.444-.737-.362-1.45-.257-2.115.175-.795.514-1.204 1.274-1.192 2.22.012.934.653 1.706 1.576 1.845.795.117 1.46-.175 1.987-.771.105-.13.199-.27.315-.434H10.47c-.245 0-.304-.152-.222-.35.152-.362.432-.968.596-1.274a.315.315 0 01.292-.187h4.253c-.023.316-.023.631-.07.947a4.983 4.983 0 01-.958 2.29c-.841 1.11-1.94 1.8-3.33 1.986-1.145.152-2.209-.07-3.143-.77-.865-.655-1.356-1.52-1.484-2.595-.152-1.274.222-2.419.993-3.424.83-1.086 1.928-1.776 3.272-2.02 1.098-.2 2.15-.06 3.096.581.573.386.995.9 1.298 1.53.07.117.035.176-.105.222z"/></svg>;
}
function RestIcon({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
}
function ConnectorIcon({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;
}

const WORKER_TYPE_ICONS: Record<string, (props: { size?: number }) => React.ReactNode> = {
  JAVA: JavaIcon,
  PYTHON: PythonIcon,
  JAVASCRIPT: JsIcon,
  GROOVY: GroovyIcon,
  CSHARP: CsharpIcon,
  GO: GoIcon,
  REST: RestIcon,
  CONNECTOR: ConnectorIcon,
};

const WORKER_TYPES = [
  { id: 'JAVA', label: 'Java', lang: 'java' },
  { id: 'PYTHON', label: 'Python', lang: 'python' },
  { id: 'JAVASCRIPT', label: 'JavaScript', lang: 'javascript' },
  { id: 'GROOVY', label: 'Groovy', lang: 'groovy' },
  { id: 'CSHARP', label: 'C#', lang: 'csharp' },
  { id: 'GO', label: 'Go', lang: 'go' },
  { id: 'REST', label: 'REST API', lang: 'json' },
  { id: 'CONNECTOR', label: 'Connector', lang: 'json' },
] as const;

const POLL_TYPES = ['LONG_POLLING', 'INTERVAL', 'PUSH'] as const;
const BACKOFF_TYPES = ['FIXED', 'LINEAR', 'EXPONENTIAL'] as const;
const RESOLUTION_OPTIONS = ['RETRY', 'EXTEND_LOCK', 'CANCEL', 'SKIP', 'MANUAL'] as const;

const STEPS = [
  { id: 'identity', label: 'Identity', num: 1 },
  { id: 'worker', label: 'Worker', num: 2 },
  { id: 'polling', label: 'Polling & Locks', num: 3 },
  { id: 'retry', label: 'Retry & Resolution', num: 4 },
  { id: 'review', label: 'Review', num: 5 },
];

/* ── Code templates per worker type ──────────────────────────── */

function getTemplate(type: string, topicName: string): string {
  switch (type) {
    case 'JAVA':
      return `import org.camunda.bpm.client.ExternalTaskClient;
import org.camunda.bpm.client.task.ExternalTask;
import org.camunda.bpm.client.task.ExternalTaskService;

public class ${toPascal(topicName)}Worker {

    public static void main(String[] args) {
        ExternalTaskClient client = ExternalTaskClient.create()
            .baseUrl("http://localhost:8080/engine-rest")
            .asyncResponseTimeout(20000)
            .build();

        client.subscribe("${topicName}")
            .lockDuration(300000)
            .handler((ExternalTask task, ExternalTaskService service) -> {
                // Get variables
                String input = task.getVariable("input");

                // --- Your business logic here ---

                // Complete the task
                service.complete(task);
            })
            .open();
    }
}`;
    case 'PYTHON':
      return `from camunda.external_task.external_task import ExternalTask
from camunda.external_task.external_task_worker import ExternalTaskWorker

def handle_${toSnake(topicName)}(task: ExternalTask):
    """Handler for topic: ${topicName}"""
    # Get variables
    variables = task.get_variables()
    input_val = variables.get("input")

    # --- Your business logic here ---

    # Return result
    return task.complete({"result": "done"})

if __name__ == "__main__":
    worker = ExternalTaskWorker(
        worker_id="python-worker",
        base_url="http://localhost:8080/engine-rest",
        config={"maxTasks": 1, "lockDuration": 300000}
    )
    worker.subscribe("${topicName}", handle_${toSnake(topicName)})
    worker.start()`;
    case 'JAVASCRIPT':
      return `const { Client, logger } = require('camunda-external-task-client-js');

const client = new Client({
  baseUrl: 'http://localhost:8080/engine-rest',
  use: logger,
  asyncResponseTimeout: 20000
});

client.subscribe('${topicName}', async ({ task, taskService }) => {
  // Get variables
  const input = task.variables.get('input');

  // --- Your business logic here ---

  // Complete the task
  await taskService.complete(task, {
    result: 'done'
  });
});`;
    case 'GROOVY':
      return `import org.camunda.bpm.client.ExternalTaskClient

def client = ExternalTaskClient.create()
    .baseUrl("http://localhost:8080/engine-rest")
    .asyncResponseTimeout(20000)
    .build()

client.subscribe("${topicName}")
    .lockDuration(300000)
    .handler { task, service ->
        // Get variables
        def input = task.getVariable("input")

        // --- Your business logic here ---

        // Complete the task
        service.complete(task)
    }
    .open()`;
    case 'CSHARP':
      return `using Camunda.Worker;
using Camunda.Worker.Client;

[HandlerTopic("${topicName}", LockDuration = 300000)]
public class ${toPascal(topicName)}Handler : IExternalTaskHandler
{
    public async Task<IExecutionResult> HandleAsync(
        ExternalTask externalTask,
        CancellationToken ct)
    {
        // Get variables
        var input = externalTask.Variables["input"].Value;

        // --- Your business logic here ---

        return new CompleteResult
        {
            Variables = new Dictionary<string, Variable>
            {
                ["result"] = new Variable("done", "String")
            }
        };
    }
}`;
    case 'GO':
      return `package main

import (
    "fmt"
    camunda "github.com/citilinkru/camunda-client-go/v3"
    "github.com/citilinkru/camunda-client-go/v3/processor"
)

func main() {
    client, _ := camunda.NewClient(camunda.ClientOptions{
        EndpointUrl: "http://localhost:8080/engine-rest",
    })

    proc := processor.NewProcessor(client, &processor.Options{
        WorkerId:                 "go-worker",
        LockDuration:             300000,
        MaxTasks:                 1,
        MaxParallelTaskPerHandler: 1,
    }, nil)

    proc.AddHandler(
        &[]camunda.QueryFetchAndLockTopic{
            {TopicName: "${topicName}", LockDuration: 300000},
        },
        func(ctx *processor.Context) error {
            // Get variables
            input := ctx.Task.Variables["input"]
            fmt.Println("Processing:", input)

            // --- Your business logic here ---

            return ctx.Complete(processor.QueryComplete{})
        },
    )

    proc.Run()
}`;
    case 'REST':
      return `{
  "method": "POST",
  "url": "https://api.example.com/action",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer {{env.API_KEY}}"
  },
  "body": {
    "input": "{{task.variables.input}}",
    "processInstanceId": "{{task.processInstanceId}}"
  },
  "timeout": 30000,
  "retryOnStatus": [502, 503, 504],
  "resultMapping": {
    "result": "$.data.result",
    "status": "$.data.status"
  }
}`;
    case 'CONNECTOR':
      return `{
  "connectorType": "http-connector",
  "config": {
    "url": "https://api.example.com/webhook",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    },
    "payload": {
      "event": "${topicName}",
      "data": "{{task.variables}}"
    }
  },
  "inputMapping": {
    "input": "task.variables.input"
  },
  "outputMapping": {
    "result": "response.body.result"
  }
}`;
    default:
      return '// Write your worker code here';
  }
}

function toPascal(s: string): string {
  return s.split(/[-_.]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}
function toSnake(s: string): string {
  return s.replace(/[-. ]/g, '_').toLowerCase();
}

/* ── Input style ─────────────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  padding: '0.5rem 0.75rem',
  width: '100%',
  outline: 'none',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
};

/* ================================================================== */
/*  Main Page                                                          */
/* ================================================================== */

export default function RegisterTopicPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const username = useAuthStore((s) => s.username);
  const [step, setStep] = useState(0);

  const [form, setForm] = useState({
    topicName: '',
    description: '',
    workerType: 'JAVA',
    workerClass: '',
    workerName: '',
    workerCode: '',
    pollType: 'LONG_POLLING' as string,
    pollIntervalMs: '' as string | number,
    lockDurationMs: 300000 as number,
    autoExtendLock: false,
    maxTasksPerPoll: 1,
    retries: 3,
    retryDelayMs: '' as string | number,
    retryBackoff: 'FIXED',
    resolutionPaths: ['RETRY', 'EXTEND_LOCK', 'MANUAL'] as string[],
    autoRetryOnFailure: true,
    staleLockTimeoutMs: '' as string | number,
  });

  const set = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));

  const workerMeta = WORKER_TYPES.find((w) => w.id === form.workerType) ?? WORKER_TYPES[0];

  // Initialize code template when worker type or topic changes
  const initCode = () => {
    if (!form.workerCode || form.workerCode.includes('Your business logic here') || form.workerCode.includes('connectorType') || form.workerCode.includes('api.example.com')) {
      set('workerCode', getTemplate(form.workerType, form.topicName || 'myTopic'));
    }
  };

  const createMutation = useMutation({
    mutationFn: (body: Partial<RegisteredTopic>) => createRegisteredTopic({ ...body, createdBy: username ?? undefined }),
    onSuccess: () => {
      toast.success('Topic registered successfully');
      queryClient.invalidateQueries({ queryKey: ['registeredTopics'] });
      navigate('/external-tasks/topics');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Failed to register topic'),
  });

  const handleSubmit = () => {
    createMutation.mutate({
      topicName: form.topicName.trim(),
      description: form.description || undefined,
      workerType: form.workerType,
      workerClass: form.workerClass || undefined,
      workerName: form.workerName || undefined,
      pollType: form.pollType,
      pollIntervalMs: form.pollIntervalMs ? Number(form.pollIntervalMs) : undefined,
      lockDurationMs: Number(form.lockDurationMs),
      autoExtendLock: form.autoExtendLock,
      maxTasksPerPoll: Number(form.maxTasksPerPoll),
      retries: Number(form.retries),
      retryDelayMs: form.retryDelayMs ? Number(form.retryDelayMs) : undefined,
      retryBackoff: form.retryBackoff,
      resolutionPaths: form.resolutionPaths.join(','),
      autoRetryOnFailure: form.autoRetryOnFailure,
      staleLockTimeoutMs: form.staleLockTimeoutMs ? Number(form.staleLockTimeoutMs) : undefined,
    } as any);
  };

  const canNext = () => {
    if (step === 0) return !!form.topicName.trim();
    return true;
  };

  const toggleResolution = (opt: string) => {
    set('resolutionPaths', form.resolutionPaths.includes(opt)
      ? form.resolutionPaths.filter((r) => r !== opt)
      : [...form.resolutionPaths, opt]);
  };

  /* ── Render ────────────────────────────────────────────────── */

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/external-tasks/topics')} className="p-1.5 rounded-md cursor-pointer bg-transparent border-none hover:bg-elevated transition-colors" style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Register External Task Topic</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Configure worker, polling, retry strategy, and resolution paths</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1 flex-1">
            <button
              onClick={() => { if (i <= step) setStep(i); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors w-full"
              style={{
                backgroundColor: i === step ? 'var(--accent-blue)' : i < step ? 'rgba(34,197,94,0.1)' : 'var(--bg-elevated)',
                color: i === step ? '#fff' : i < step ? 'var(--accent-green)' : 'var(--text-muted)',
                border: `1px solid ${i === step ? 'var(--accent-blue)' : i < step ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
              }}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ backgroundColor: i < step ? 'var(--accent-green)' : 'transparent', color: i < step ? '#fff' : 'inherit' }}>
                {i < step ? <Check size={12} /> : s.num}
              </span>
              <span className="truncate">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} className="shrink-0" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card>
        <div style={{ minHeight: 400 }}>
          {/* ── Step 1: Identity ──────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Topic Identity</h2>
              <Field label="Topic Name *" hint="Must match camunda:topic in your BPMN service task"
                tooltip="This is the unique identifier workers use to subscribe to tasks. It must exactly match the camunda:topic attribute on your BPMN service task. Example: if your BPMN has camunda:topic='send-email', enter 'send-email' here. Deployments with unregistered topics will be rejected.">
                <input type="text" value={form.topicName} onChange={(e) => set('topicName', e.target.value)}
                  placeholder="e.g. send-email, generate-report, process-payment" style={inputStyle} autoFocus />
              </Field>
              <Field label="Description"
                tooltip="A human-readable explanation of what this external task does, its business purpose, expected inputs/outputs, and any SLA requirements. This helps other developers understand the task without reading the worker code.">
                <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
                  placeholder="Sends transactional email notifications to customers via SMTP relay" rows={4}
                  style={{ ...inputStyle, resize: 'vertical' }} />
              </Field>
            </div>
          )}

          {/* ── Step 2: Worker ────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Worker Configuration</h2>

              <Field label="Worker Type" hint="Language / runtime of the external task handler"
                tooltip="Select the programming language your worker is written in. Java and C# use the official Camunda client SDK. Python and JavaScript have community clients. REST type lets you configure an HTTP call without writing code. Connector uses pre-built integration plugins.">
                <div className="grid grid-cols-4 gap-2">
                  {WORKER_TYPES.map((wt) => (
                    <button key={wt.id} type="button"
                      onClick={() => { set('workerType', wt.id); set('workerCode', getTemplate(wt.id, form.topicName || 'myTopic')); }}
                      className="flex flex-col items-center gap-1 p-3 rounded-lg text-sm font-medium cursor-pointer transition-all"
                      style={{
                        backgroundColor: form.workerType === wt.id ? 'var(--accent-blue)' : 'var(--bg-elevated)',
                        color: form.workerType === wt.id ? '#fff' : 'var(--text-secondary)',
                        border: `2px solid ${form.workerType === wt.id ? 'var(--accent-blue)' : 'var(--border)'}`,
                        transform: form.workerType === wt.id ? 'scale(1.02)' : 'scale(1)',
                      }}>
                      <span>{(WORKER_TYPE_ICONS[wt.id] ?? (() => null))({ size: 22 })}</span>
                      <span>{wt.label}</span>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Worker Class / Module Path" hint={
                form.workerType === 'REST' ? 'Not applicable for REST type' :
                form.workerType === 'CONNECTOR' ? 'Connector class or plugin ID' :
                `Fully qualified ${workerMeta.label} class, module, or script path`
              } tooltip="The entry point of your worker application. For Java, this is the fully qualified class name (e.g. com.example.Worker). For Python, the module path (e.g. workers.handler). For JS, the script file path. This is used for documentation and traceability — the engine does not invoke the worker directly.">
                <input type="text" value={form.workerClass} onChange={(e) => set('workerClass', e.target.value)}
                  placeholder={form.workerType === 'JAVA' ? 'com.example.workers.SendEmailWorker' :
                    form.workerType === 'PYTHON' ? 'workers.send_email.handler' :
                    form.workerType === 'JAVASCRIPT' ? './workers/sendEmail.js' :
                    form.workerType === 'GO' ? 'github.com/myorg/workers/sendemail' :
                    form.workerType === 'CSHARP' ? 'MyApp.Workers.SendEmailHandler' :
                    form.workerType === 'REST' ? 'https://api.example.com/webhook' :
                    'worker path'}
                  style={inputStyle} disabled={form.workerType === 'REST'} />
              </Field>

              <Field label="Worker Service Name" hint="Identifier of the worker application or microservice"
                tooltip="A logical name for the worker service or microservice that handles this topic. Used for monitoring and debugging — when multiple workers subscribe to the same topic, this helps identify which service instance processed a task. Example: 'email-service-prod', 'payment-worker-v2'.">
                <input type="text" value={form.workerName} onChange={(e) => set('workerName', e.target.value)}
                  placeholder="e.g. email-worker-service, payment-processor" style={inputStyle} />
              </Field>

              {/* Live code editor */}
              <Field label={`${workerMeta.label} Worker Template`} hint="Reference implementation — edit to match your use case"
                tooltip="A live code editor with a working boilerplate for your chosen worker type. This template shows the correct SDK imports, topic subscription, variable access, and task completion pattern. Edit the code to match your business logic. The code is saved with the topic registration for reference — it is not executed by the engine.">
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <Suspense fallback={<div className="flex items-center justify-center" style={{ height: 350, backgroundColor: 'var(--bg-elevated)' }}><span style={{ color: 'var(--text-muted)' }}>Loading editor...</span></div>}>
                    <MonacoEditor
                      height={350}
                      language={workerMeta.lang}
                      theme="vs-dark"
                      value={form.workerCode || getTemplate(form.workerType, form.topicName || 'myTopic')}
                      onChange={(val) => set('workerCode', val ?? '')}
                      onMount={() => initCode()}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        tabSize: 2,
                        automaticLayout: true,
                        padding: { top: 12 },
                      }}
                    />
                  </Suspense>
                </div>
              </Field>
            </div>
          )}

          {/* ── Step 3: Polling & Locks ───────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Polling & Lock Configuration</h2>

              <Field label="Poll Type" hint="How the worker fetches tasks from the engine"
                tooltip="LONG POLLING: Worker opens a persistent HTTP connection that blocks until a task is available or timeout is reached. Most efficient, lowest latency. INTERVAL: Worker polls at fixed time intervals — simpler but adds latency. PUSH: Engine pushes tasks to the worker via webhook — requires the worker to expose an HTTP endpoint.">
                <div className="flex gap-2">
                  {POLL_TYPES.map((pt) => (
                    <button key={pt} type="button" onClick={() => set('pollType', pt)}
                      className="flex-1 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors text-center"
                      style={{
                        backgroundColor: form.pollType === pt ? 'var(--accent-blue)' : 'var(--bg-elevated)',
                        color: form.pollType === pt ? '#fff' : 'var(--text-secondary)',
                        border: `1px solid ${form.pollType === pt ? 'var(--accent-blue)' : 'var(--border)'}`,
                      }}>
                      {pt.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </Field>

              {form.pollType === 'INTERVAL' && (
                <Field label="Poll Interval (ms)" hint="How often the worker polls for new tasks"
                  tooltip="The time in milliseconds between each poll request. Lower values mean faster task pickup but more engine load. Typical: 1000-10000ms. For high-throughput topics use 1000ms, for background jobs use 5000-10000ms.">
                  <input type="number" value={form.pollIntervalMs} onChange={(e) => set('pollIntervalMs', e.target.value)} placeholder="5000" style={inputStyle} />
                </Field>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Field label="Lock Duration (ms)" hint="How long the worker holds the task lock"
                  tooltip="When a worker fetches a task, it acquires an exclusive lock for this duration. If the worker doesn't complete or extend the lock before it expires, the task becomes available for other workers. Set this longer than your expected processing time. Too short = tasks get picked up by multiple workers. Too long = failed workers block the task.">
                  <input type="number" value={form.lockDurationMs} onChange={(e) => set('lockDurationMs', Number(e.target.value))} placeholder="300000" style={inputStyle} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>= {Math.round((form.lockDurationMs || 0) / 60000)} min</span>
                </Field>
                <Field label="Max Tasks Per Poll" hint="Tasks fetched in a single poll batch"
                  tooltip="Number of tasks the worker requests in a single fetch-and-lock call. Set to 1 for sequential processing. Higher values enable batch processing but the worker must handle concurrency. Common: 1 for critical tasks, 5-10 for lightweight batch jobs.">
                  <input type="number" value={form.maxTasksPerPoll} onChange={(e) => set('maxTasksPerPoll', Number(e.target.value))} placeholder="1" min={1} style={inputStyle} />
                </Field>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.autoExtendLock} onChange={(e) => set('autoExtendLock', e.target.checked)} className="accent-[var(--accent-blue)]" />
                  <div>
                    <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Auto-extend lock
                      <Tooltip content="When enabled, the worker SDK automatically renews the lock at 50% of the lock duration. Prevents lock expiry during long-running tasks like file processing or batch operations. Requires SDK support — Java and JS clients support this natively." side="right" wide>
                        <HelpCircle size={13} style={{ color: 'var(--text-muted)', cursor: 'help' }} />
                      </Tooltip>
                    </span>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Automatically extend lock before it expires during long-running tasks</p>
                  </div>
                </label>
              </div>

              <Field label="Stale Lock Timeout (ms)" hint="After this time, unreleased locks are considered stale and can be reclaimed by another worker"
                tooltip="If a worker crashes or loses network connectivity while holding a lock, the task is stuck until the lock expires. The stale lock timeout defines an additional grace period after lock expiry — once exceeded, the system considers the lock abandoned and makes the task available. Set to 2x your lock duration as a safety margin.">
                <input type="number" value={form.staleLockTimeoutMs} onChange={(e) => set('staleLockTimeoutMs', e.target.value)} placeholder="600000" style={inputStyle} />
              </Field>
            </div>
          )}

          {/* ── Step 4: Retry & Resolution ────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Retry & Resolution Strategy</h2>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Retry Count" hint="Attempts before creating an incident"
                  tooltip="When a worker reports a failure (via handleFailure), the engine decrements this counter. When retries reach 0, the engine creates an incident — a persistent failure that requires manual intervention or automated resolution. Set to 0 to immediately create an incident on first failure. Typical: 3 for transient errors, 0 for business validation failures.">
                  <input type="number" value={form.retries} onChange={(e) => set('retries', Number(e.target.value))} placeholder="3" min={0} style={inputStyle} />
                </Field>
                <Field label="Retry Delay (ms)" hint="Wait between retry attempts"
                  tooltip="Time the engine waits before making the task available for the next retry attempt. This prevents hammering an external service that may be temporarily down. Combined with backoff strategy: FIXED keeps this delay constant, LINEAR adds this delay each retry (delay, 2x delay, 3x delay), EXPONENTIAL doubles it (delay, 2x, 4x, 8x).">
                  <input type="number" value={form.retryDelayMs} onChange={(e) => set('retryDelayMs', e.target.value)} placeholder="10000" style={inputStyle} />
                </Field>
              </div>

              <Field label="Backoff Strategy" hint="How retry delay increases between attempts"
                tooltip="FIXED: Same delay between every retry — good for consistent rate limiting. LINEAR: Delay increases by the base amount each retry (e.g. 10s, 20s, 30s) — good for gradual backoff. EXPONENTIAL: Delay doubles each retry (e.g. 10s, 20s, 40s, 80s) — best for external API calls where you want to avoid overwhelming a recovering service.">
                <div className="flex gap-2">
                  {BACKOFF_TYPES.map((bt) => (
                    <button key={bt} type="button" onClick={() => set('retryBackoff', bt)}
                      className="flex-1 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors text-center"
                      style={{
                        backgroundColor: form.retryBackoff === bt ? 'var(--accent-blue)' : 'var(--bg-elevated)',
                        color: form.retryBackoff === bt ? '#fff' : 'var(--text-secondary)',
                        border: `1px solid ${form.retryBackoff === bt ? 'var(--accent-blue)' : 'var(--border)'}`,
                      }}>
                      {bt}
                    </button>
                  ))}
                </div>
              </Field>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.autoRetryOnFailure} onChange={(e) => set('autoRetryOnFailure', e.target.checked)} className="accent-[var(--accent-blue)]" />
                <div>
                  <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Auto-retry on failure
                    <Tooltip content="When enabled, the engine automatically schedules retry attempts using the configured retry count and delay. When disabled, every failure immediately creates an incident requiring manual resolution — useful for tasks that should never be retried (e.g. financial transactions)." side="right" wide>
                      <HelpCircle size={13} style={{ color: 'var(--text-muted)', cursor: 'help' }} />
                    </Tooltip>
                  </span>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Automatically retry failed tasks vs requiring manual intervention</p>
                </div>
              </label>

              <Field label="Resolution Paths" hint="Available actions when a task fails permanently (all retries exhausted)"
                tooltip="When all retries are exhausted and an incident is created, these are the actions available to operators: RETRY — reset retries and re-execute. EXTEND LOCK — give the current worker more time. CANCEL — terminate the task and move the process forward. SKIP — mark as completed without execution. MANUAL — flag for human review in the operations dashboard.">
                <div className="flex flex-wrap gap-2">
                  {RESOLUTION_OPTIONS.map((opt) => (
                    <button key={opt} type="button" onClick={() => toggleResolution(opt)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors"
                      style={{
                        backgroundColor: form.resolutionPaths.includes(opt) ? 'var(--accent-blue)' : 'var(--bg-elevated)',
                        color: form.resolutionPaths.includes(opt) ? '#fff' : 'var(--text-secondary)',
                        border: `1px solid ${form.resolutionPaths.includes(opt) ? 'var(--accent-blue)' : 'var(--border)'}`,
                      }}>
                      {opt.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {/* ── Step 5: Review ────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Review & Register</h2>

              <div className="grid grid-cols-2 gap-4">
                <ReviewSection title="Identity">
                  <ReviewRow label="Topic Name" value={form.topicName} />
                  <ReviewRow label="Description" value={form.description || '—'} />
                </ReviewSection>

                <ReviewSection title="Worker">
                  <ReviewRow label="Type" value={form.workerType} />
                  <ReviewRow label="Class" value={form.workerClass || '—'} mono />
                  <ReviewRow label="Service" value={form.workerName || '—'} />
                </ReviewSection>

                <ReviewSection title="Polling & Locks">
                  <ReviewRow label="Poll Type" value={form.pollType.replace('_', ' ')} />
                  <ReviewRow label="Lock Duration" value={`${form.lockDurationMs}ms (${Math.round(form.lockDurationMs / 60000)} min)`} />
                  <ReviewRow label="Auto-Extend" value={form.autoExtendLock ? 'Yes' : 'No'} />
                  <ReviewRow label="Max Tasks/Poll" value={String(form.maxTasksPerPoll)} />
                </ReviewSection>

                <ReviewSection title="Retry & Resolution">
                  <ReviewRow label="Retries" value={String(form.retries)} />
                  <ReviewRow label="Backoff" value={form.retryBackoff} />
                  <ReviewRow label="Auto-Retry" value={form.autoRetryOnFailure ? 'Yes' : 'No'} />
                  <ReviewRow label="Resolution" value={form.resolutionPaths.join(', ')} />
                </ReviewSection>
              </div>

              {form.workerCode && (
                <div>
                  <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Worker Code</h3>
                  <pre className="text-xs font-mono-id p-3 rounded-lg overflow-auto" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', maxHeight: 200 }}>
                    {form.workerCode}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-6 mt-6" style={{ borderTop: '1px solid var(--border)' }}>
          <div>
            {step > 0 && (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                <ChevronLeft size={16} className="mr-1" /> Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Step {step + 1} of {STEPS.length}</span>
            {step < STEPS.length - 1 ? (
              <Button variant="primary" onClick={() => setStep(step + 1)} disabled={!canNext()}>
                Next <ChevronRight size={16} className="ml-1" />
              </Button>
            ) : (
              <Button variant="primary" onClick={handleSubmit} disabled={createMutation.isPending || !form.topicName.trim()}>
                {createMutation.isPending ? 'Registering...' : 'Register Topic'}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────── */

function Field({ label, hint, tooltip, children }: { label: string; hint?: string; tooltip?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</label>
        {tooltip && (
          <Tooltip content={tooltip} side="right" wide>
            <HelpCircle size={14} style={{ color: 'var(--text-muted)', cursor: 'help' }} />
          </Tooltip>
        )}
      </div>
      {children}
      {hint && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
      <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className={`text-sm text-right ${mono ? 'font-mono-id' : ''}`} style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}