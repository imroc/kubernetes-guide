import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  kubernetesSidebar: [
    {
      type: "doc",
      id: "README",
      customProps: {
        slug: "/"
      }
    },
    {
      type: 'category',
      label: '集群搭建',
      collapsed: true,
      link: {
        type: 'generated-index',
        slug: '/deploy'
      },
      items: [
        {
          type: 'category',
          label: '使用 kubespray 搭建集群',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/deploy/kubespray'
          },
          items: [
            'deploy/kubespray/install',
            'deploy/kubespray/offline',
          ],
        },
        {
          type: 'category',
          label: '使用 k3s 安装轻量集群',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/deploy/k3s'
          },
          items: [
            'deploy/k3s/install',
            'deploy/k3s/offline',
          ],
        },
        'deploy/terraform',
        {
          type: 'category',
          label: '在 AWS 上创建集群',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/deploy/aws'
          },
          items: [
            'deploy/aws/eks',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: '高效使用 kubectl',
      collapsed: true,
      link: {
        type: 'generated-index',
        slug: '/kubectl'
      },
      items: [
        'kubectl/kubectl-aliases',
        'kubectl/quick-switch-with-kubectx',
        'kubectl/merge-kubeconfig-with-kubecm',
        'kubectl/kubie',
        'kubectl/build',
      ],
    },
    {
      type: 'category',
      label: '镜像相关实践',
      collapsed: true,
      link: {
        type: 'generated-index',
        slug: '/images'
      },
      items: [
        'images/podman',
        'images/sync-images-with-skopeo',
      ],
    },
    {
      type: 'category',
      label: '应用部署',
      collapsed: true,
      link: {
        type: 'generated-index',
        slug: '/apps'
      },
      items: [
        'apps/set-sysctl',
      ],
    },
    {
      type: 'category',
      label: 'GitOps',
      collapsed: true,
      link: {
        type: 'generated-index',
        slug: '/gitops'
      },
      items: [
        {
          type: 'category',
          label: 'ArgoCD GitOps 实践',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/gitops/argocd'
          },
          items: [
            'gitops/argocd/install',
            'gitops/argocd/cluster-and-repo',
            'gitops/argocd/project',
          ]
        },
      ],
    },
    {
      type: 'category',
      label: '证书签发',
      collapsed: true,
      link: {
        type: 'generated-index',
        slug: '/certs'
      },
      items: [
        'certs/sign-certs-with-cfssl',
        'certs/sign-free-certs-with-cert-manager',
      ],
    },
    {
      type: 'category',
      label: '用户与权限',
      collapsed: true,
      link: {
        type: 'generated-index',
        slug: '/rbac'
      },
      items: [
        'rbac/create-user-using-csr-api',
      ],
    },
    {
      type: 'category',
      label: '监控告警',
      collapsed: true,
      link: {
        type: 'generated-index',
        slug: '/monitoring'
      },
      items: [
        {
          type: 'category',
          label: 'Prometheus',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/monitoring/prometheus'
          },
          items: [
            'monitoring/prometheus/annotation-discovery',
          ],
        },
        {
          type: 'category',
          label: 'Grafana',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/monitoring/grafana'
          },
          items: [
            'monitoring/grafana/ha',
          ],
        },
        {
          type: 'category',
          label: 'Victoria Metrics',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/monitoring/victoriametrics'
          },
          items: [
            'monitoring/victoriametrics/install-with-operator',
          ],
        }
      ],
    },
    {
      type: 'category',
      label: '最佳实践',
      collapsed: true,
      link: {
        type: 'generated-index',
        slug: '/best-practices'
      },
      items: [
        {
          type: 'category',
          label: '优雅终止',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/best-practices/graceful-shutdown'
          },
          items: [
            'best-practices/graceful-shutdown/intro',
            'best-practices/graceful-shutdown/pod-termination-proccess',
            'best-practices/graceful-shutdown/sigterm',
            'best-practices/graceful-shutdown/prestop',
            'best-practices/graceful-shutdown/update-strategy',
            'best-practices/graceful-shutdown/long-connection',
            'best-practices/graceful-shutdown/lb-to-pod-directly',
          ],
        },
        {
          type: 'category',
          label: 'DNS',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/best-practices/dns'
          },
          items: [
            'best-practices/dns/customize-dns-resolution',
            'best-practices/dns/optimize-coredns-performance',
          ],
        },
        {
          type: 'category',
          label: '性能优化',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/best-practices/performance-optimization'
          },
          items: [
            'best-practices/performance-optimization/network',
            'best-practices/performance-optimization/cpu',
          ],
        },
        {
          type: 'category',
          label: '高可用',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/best-practices/ha'
          },
          items: [
            'best-practices/ha/pod-split-up-scheduling',
            'best-practices/ha/smooth-upgrade',
          ],
        },
        {
          type: 'category',
          label: '弹性伸缩',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/best-practices/autoscaling'
          },
          items: [
            'best-practices/autoscaling/hpa-velocity',
            {
              type: 'category',
              label: 'HPA 使用自定义指标进行伸缩',
              collapsed: true,
              link: {
                type: 'generated-index',
                slug: '/best-practices/autoscaling/hpa-with-custom-metrics'
              },
              items: [
                'best-practices/autoscaling/hpa-with-custom-metrics/prometheus-adapter',
                'best-practices/autoscaling/hpa-with-custom-metrics/keda',
              ]
            },
            {
              type: 'category',
              label: '事件驱动弹性伸缩(KEDA)',
              collapsed: true,
              link: {
                type: 'generated-index',
                slug: '/best-practices/autoscaling/keda'
              },
              items: [
                'best-practices/autoscaling/keda/overview',
                'best-practices/autoscaling/keda/install',
                'best-practices/autoscaling/keda/cron',
                'best-practices/autoscaling/keda/workload',
                'best-practices/autoscaling/keda/prometheus',
              ]
            }
          ],
        },
        {
          type: 'category',
          label: '容器化',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/best-practices/containerization'
          },
          items: [
            'best-practices/containerization/thin-image',
            'best-practices/containerization/systemd',
            'best-practices/containerization/java',
            'best-practices/containerization/golang',
            'best-practices/containerization/crontab',
            'best-practices/containerization/timezone',
            'best-practices/containerization/logrotate',
          ],
        },
        {
          type: 'category',
          label: '集群运维',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/best-practices/ops'
          },
          items: [
            'best-practices/ops/securely-maintain-or-offline-node',
            'best-practices/ops/securely-modify-container-root-dir',
            'best-practices/ops/large-scale-cluster-optimization',
            'best-practices/ops/etcd-optimization',
            'best-practices/ops/batch-operate-node-with-ansible',
          ],
        },
        'best-practices/configure-healthcheck',
        'best-practices/request-limit',
        'best-practices/logging',
        'best-practices/long-connection',
      ]
    },
    {
      type: 'category',
      label: '开发指南',
      collapsed: true,
      link: {
        type: 'generated-index',
        slug: '/dev'
      },
      items: [
        {
          type: 'category',
          label: '使用 kubebuilder 开发 Controller',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/dev/kubebuilder'
          },
          items: [
            'dev/kubebuilder/quickstart',
            'dev/kubebuilder/multi-version',
            'dev/kubebuilder/remove-api',
            'dev/kubebuilder/webhook',
            'dev/kubebuilder/init-before-start',
            'dev/kubebuilder/reconcile-trigger',
            'dev/kubebuilder/reconcile',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: '实践案例',
      collapsed: true,
      link: {
        type: 'generated-index',
        slug: '/cases'
      },
      items: [
        {
          type: 'category',
          label: '云原生家庭网络',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/cases/home-network'
          },
          items: [
            'cases/home-network/intro',
            'cases/home-network/network-config',
            'cases/home-network/prepare',
            'cases/home-network/dnsmasq',
            'cases/home-network/radvd',
            'cases/home-network/ddns',
            'cases/home-network/ikev2',
            'cases/home-network/nfs',
            'cases/home-network/samba',
            'cases/home-network/aria2',
            'cases/home-network/qbittorrent',
            'cases/home-network/alist',
            'cases/home-network/filebrowser',
            'cases/home-network/jellyfin',
            'cases/home-network/home-assistant',
            'cases/home-network/monitoring',
            'cases/home-network/homepage',
            'cases/home-network/tproxy',
            'cases/home-network/containerized-nftables',
            'cases/home-network/gitops',
          ]
        },
        'cases/llama3',

        {
          type: 'category',
          label: '打造超级富容器开发环境',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/cases/devcontainer'
          },
          items: [
            'cases/devcontainer/overview',
            'cases/devcontainer/host',
            'cases/devcontainer/dockerfile',
            'cases/devcontainer/deploy',
            'cases/devcontainer/packages',
            'cases/devcontainer/ssh',
            'cases/devcontainer/lang',
            'cases/devcontainer/other',
            'cases/devcontainer/dind',
            'cases/devcontainer/sync-config',
          ]
        },
      ],
    },
    {
      type: 'category',
      label: '附录',
      collapsed: true,
      link: {
        type: 'generated-index',
        slug: '/appendix'
      },
      items: [
        {
          type: 'category',
          label: 'kubectl 速查手册',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/appendix/kubectl'
          },
          items: [
            'appendix/kubectl/get-raw',
            'appendix/kubectl/node',
            'appendix/kubectl/pod',
          ]
        },
        {
          type: 'category',
          label: '实用 YAML',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/appendix/yaml'
          },
          items: [
            'appendix/yaml/test',
            'appendix/yaml/rbac',
            'appendix/yaml/apiserver',
          ]
        },
        {
          type: 'category',
          label: 'Terrafrom 配置',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/appendix/terraform'
          },
          items: [
            'appendix/terraform/tke-vpc-cni',
            'appendix/terraform/tke-serverless',
          ]
        },
        {
          type: 'category',
          label: '常见问题',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/appendix/faq'
          },
          items: [
            'appendix/faq/why-enable-bridge-nf-call-iptables',
            'appendix/faq/ipvs-conn-reuse-mode',
          ],
        },
        {
          type: 'category',
          label: '云厂商调研',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/appendix/vendor'
          },
          items: [
            {
              type: 'category',
              label: '阿里云',
              collapsed: true,
              link: {
                type: 'generated-index',
                slug: 'appendix/vendor/aliyun'
              },
              items: [
                'appendix/vendor/aliyun/terway',
                'appendix/vendor/aliyun/kube-proxy',
                'appendix/vendor/aliyun/os',
              ]
            },
            {
              type: 'category',
              label: 'AWS',
              collapsed: true,
              link: {
                type: 'generated-index',
                slug: 'appendix/vendor/aws'
              },
              items: [
                'appendix/vendor/aws/vpc-cni',
                'appendix/vendor/aws/cilium',
              ]
            },
            {
              type: 'category',
              label: 'Google Cloud',
              collapsed: true,
              link: {
                type: 'generated-index',
                slug: 'appendix/vendor/gcloud'
              },
              items: [
                'appendix/vendor/gcloud/cni',
                'appendix/vendor/gcloud/container-runtime',
                'appendix/vendor/gcloud/kube-proxy',
                'appendix/vendor/gcloud/cilium',
                'appendix/vendor/gcloud/os',
              ]
            },
            {
              type: 'category',
              label: '火山引擎',
              collapsed: true,
              link: {
                type: 'generated-index',
                slug: 'appendix/vendor/volcengine'
              },
              items: [
                'appendix/vendor/volcengine/vpc-cni',
                'appendix/vendor/volcengine/flannel',
                'appendix/vendor/volcengine/container-runtime',
              ]
            },
            'appendix/vendor/cilium',
          ],
        }
      ],
    },
  ],
};

export default sidebars;
