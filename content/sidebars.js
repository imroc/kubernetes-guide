/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
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
          label: '安装 k3s 轻量集群',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/deploy/k3s'
          },
          items: [
            'deploy/k3s/install-cases',
            'deploy/k3s/offline-installation',
          ],
        },
        'deploy/terraform',
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
            'best-practices/graceful-shutdown/code-example-of-handle-sigterm',
            'best-practices/graceful-shutdown/why-cannot-receive-sigterm',
            'best-practices/graceful-shutdown/propagating-signals-in-shell',
            'best-practices/graceful-shutdown/use-prestop',
            'best-practices/graceful-shutdown/persistent-connection',
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
            'best-practices/autoscaling/hpa-with-custom-metrics',
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
            'best-practices/containerization/systemd-in-container',
            'best-practices/containerization/java',
            'best-practices/containerization/golang',
            'best-practices/containerization/crontab-in-container',
            'best-practices/containerization/timezone',
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
          label: 'grafana',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/monitoring/grafana'
          },
          items: [
            'monitoring/grafana/ha-setup',
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
      label: '集群网络',
      collapsed: true,
      link: {
        type: 'generated-index',
        slug: '/networking'
      },
      items: [
        {
          type: 'category',
          label: '常见问题',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/networking/faq'
          },
          items: [
            'networking/faq/why-enable-bridge-nf-call-iptables',
            'networking/faq/ipvs-conn-reuse-mode',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: '实用技巧',
      collapsed: true,
      link: {
        type: 'generated-index',
        slug: '/trick'
      },
      items: [
        {
          type: 'category',
          label: '高效使用 kubectl',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/trick/kubectl'
          },
          items: [
            'trick/kubectl/kubectl-aliases',
            'trick/kubectl/quick-switch-with-kubectx',
            'trick/kubectl/merge-kubeconfig-with-kubecm',
          ],
        },
        {
          type: 'category',
          label: '镜像相关',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/trick/images'
          },
          items: [
            'trick/images/podman',
            'trick/images/sync-images-with-skopeo',
          ],
        },
        {
          type: 'category',
          label: '部署与配置',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/trick/deploy'
          },
          items: [
            'trick/deploy/set-sysctl',
          ],
        },
        {
          type: 'category',
          label: '证书签发',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/trick/certs'
          },
          items: [
            'trick/certs/sign-certs-with-cfssl',
            'trick/certs/sign-free-certs-with-cert-manager',
            'trick/certs/sign-free-certs-for-dnspod',
          ],
        },
        {
          type: 'category',
          label: '用户与权限',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/trick/user-and-permissions'
          },
          items: [
            'trick/user-and-permissions/create-user-using-csr-api',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: '故障排查',
      collapsed: true,
      link: {
        type: 'generated-index',
        slug: '/troubleshooting'
      },
      items: [
        {
          type: 'category',
          label: '排障技能',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/troubleshooting/skill'
          },
          items: [
            'troubleshooting/skill/linux',
            'troubleshooting/skill/enter-netns-with-nsenter',
            'troubleshooting/skill/remote-capture-with-ksniff',
            'troubleshooting/skill/use-systemtap-to-locate-problems',
            'troubleshooting/skill/tcpdump',
            'troubleshooting/skill/wireshark',
          ],
        },
        {
          type: 'category',
          label: 'Pod 排障',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/troubleshooting/pod'
          },
          items: [
            'troubleshooting/pod/healthcheck-failed',
            'troubleshooting/pod/device-or-resource-busy',
            {
              type: 'category',
              label: 'Pod 状态异常',
              collapsed: true,
              link: {
                type: 'generated-index',
                slug: '/troubleshooting/pod/status'
              },
              items: [
                'troubleshooting/pod/status/intro',
                'troubleshooting/pod/status/pod-terminating',
                'troubleshooting/pod/status/pod-pending',
                'troubleshooting/pod/status/pod-containercreating-or-waiting',
                'troubleshooting/pod/status/pod-crash',
                'troubleshooting/pod/status/pod-imagepullbackoff',
              ],
            }
          ],
        },
        {
          type: 'category',
          label: '节点排障',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/troubleshooting/node'
          },
          items: [
            'troubleshooting/node/node-crash-and-vmcore',
            'troubleshooting/node/node-high-load',
            'troubleshooting/node/io-high-load',
            'troubleshooting/node/memory-fragmentation',
            'troubleshooting/node/disk-full',
            'troubleshooting/node/pid-full',
            'troubleshooting/node/arp-cache-overflow',
            'troubleshooting/node/runnig-out-of-inotify-watches',
            'troubleshooting/node/kernel-solft-lockup',
            'troubleshooting/node/no-space-left-on-device',
            'troubleshooting/node/ipvs-no-destination-available',
            'troubleshooting/node/cadvisor-no-data',
          ],
        },
        {
          type: 'category',
          label: '网络排障',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/troubleshooting/network'
          },
          items: [
            'troubleshooting/network/timeout',
            'troubleshooting/network/packet-loss',
            'troubleshooting/network/network-unreachable',
            'troubleshooting/network/slow-network-traffic',
            'troubleshooting/network/dns-exception',
            'troubleshooting/network/close-wait-stacking',
            'troubleshooting/network/traffic-surge',
          ],
        },
        {
          type: 'category',
          label: '存储排障',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/troubleshooting/storage'
          },
          items: [
            'troubleshooting/storage/unable-to-mount-volumes',
            'troubleshooting/storage/setup-failed-for-volume',
          ],
        },
        {
          type: 'category',
          label: '集群排障',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/troubleshooting/cluster'
          },
          items: [
            'troubleshooting/cluster/namespace-terminating',
          ],
        },
        "troubleshooting/sdk",
        {
          type: 'category',
          label: '排障案例',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/troubleshooting/cases'
          },
          items: [
            {
              type: 'category',
              label: '运行时排障',
              collapsed: true,
              link: {
                type: 'generated-index',
                slug: '/troubleshooting/cases/runtime'
              },
              items: [
                'troubleshooting/cases/runtime/io-high-load-causing-pod-creation-timeout',
                'troubleshooting/cases/runtime/pull-image-fail-in-high-version-containerd',
                'troubleshooting/cases/runtime/mount-root-causing-device-or-resource-busy',
                'troubleshooting/cases/runtime/broken-system-time-causing-sandbox-conflicts',
              ],
            },
            {
              type: 'category',
              label: '网络排障',
              collapsed: true,
              link: {
                type: 'generated-index',
                slug: '/troubleshooting/cases/network'
              },
              items: [
                'troubleshooting/cases/network/dns-lookup-5s-delay',
                'troubleshooting/cases/network/arp-cache-overflow-causing-healthcheck-failed',
                'troubleshooting/cases/network/cross-vpc-connect-nodeport-timeout',
                'troubleshooting/cases/network/musl-libc-dns-id-conflict-causing-dns-abnormal',
              ],
            },
            {
              type: 'category',
              label: '高负载',
              collapsed: true,
              link: {
                type: 'generated-index',
                slug: '/troubleshooting/cases/high-load'
              },
              items: [
                'troubleshooting/cases/high-load/disk-full-causing-high-cpu',
              ],
            },
            {
              type: 'category',
              label: '集群故障',
              collapsed: true,
              link: {
                type: 'generated-index',
                slug: '/troubleshooting/cases/cluster'
              },
              items: [
                'troubleshooting/cases/cluster/delete-rancher-ns-causing-node-disappear',
                'troubleshooting/cases/cluster/scheduler-snapshot-missing-causing-pod-pending',
                'troubleshooting/cases/cluster/kubectl-exec-or-logs-failed',
              ],
            },
            {
              type: 'category',
              label: '节点排障',
              collapsed: true,
              link: {
                type: 'generated-index',
                slug: '/troubleshooting/cases/node'
              },
              items: [
                'troubleshooting/cases/node/cgroup-leaking',
              ],
            },
            {
              type: 'category',
              label: '其它排障',
              collapsed: true,
              link: {
                type: 'generated-index',
                slug: '/troubleshooting/cases/others'
              },
              items: [
                'troubleshooting/cases/others/failed-to-modify-hosts-in-multiple-container',
                'troubleshooting/cases/others/job-cannot-delete',
                'troubleshooting/cases/others/dotnet-configuration-cannot-auto-reload',
              ],
            },
          ],
        }
      ],
    },
    {
      type: 'category',
      label: '腾讯云容器服务',
      collapsed: true,
      link: {
        type: 'generated-index',
        slug: '/tencent'
      },
      items: [
        {
          type: 'category',
          label: 'Serverless 集群与超级节点',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/tencent/serverless'
          },
          items: [
            'tencent/serverless/precautions',
            'tencent/serverless/why-tke-supernode-rocks',
            'tencent/serverless/supernode-case-online',
            'tencent/serverless/supernode-case-offline',
            'tencent/serverless/large-image-solution',
          ],
        },
        {
          type: 'category',
          label: '网络指南',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/tencent/networking'
          },
          items: [
            'tencent/networking/clb-to-pod-directly',
            'tencent/networking/how-to-use-eip',
            'tencent/networking/install-localdns-with-ipvs',
            'tencent/networking/expose-grpc-with-tcm',
          ],
        },
        {
          type: 'category',
          label: '存储指南',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/tencent/storage'
          },
          items: [
            'tencent/storage/cbs-pvc-expansion',
            'tencent/storage/readonlymany-pv',
            'tencent/storage/mount-cfs-with-v3',
          ],
        },
        {
          type: 'category',
          label: '监控告警',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/tencent/monitoring'
          },
          items: [
            'tencent/monitoring/prometheus-scrape-config',
            'tencent/monitoring/grafana-dashboard-for-supernode-pod',
          ],
        },
        {
          type: 'category',
          label: '镜像与仓库',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/tencent/images'
          },
          items: [
            'tencent/images/use-mirror-in-container',
            'tencent/images/use-foreign-container-image',
          ],
        },
        {
          type: 'category',
          label: '故障排查',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/tencent/troubleshooting'
          },
          items: [
            'tencent/troubleshooting/public-service-or-ingress-connect-failed',
          ],
        },
        {
          type: 'category',
          label: '常见应用安装与部署',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/tencent/install-apps'
          },
          items: [
            'tencent/install-apps/install-harbor-on-tke',
            'tencent/install-apps/install-gitlab-on-tke',
            'tencent/install-apps/install-kubesphere-on-tke',
          ],
        },
        {
          type: 'category',
          label: '常见问题',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/tencent/faq'
          },
          items: [
            'tencent/faq/modify-rp-filter-causing-exception',
            'tencent/faq/clb-loopback',
            'tencent/faq/controller-manager-and-scheduler-unhealthy',
          ],
        },
        {
          type: 'category',
          label: '解决方案',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/tencent/solution'
          },
          items: [
            'tencent/solution/multi-account',
            'tencent/solution/upgrade-inplace',
          ],
        },
        {
          type: 'category',
          label: '附录',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/tencent/appendix'
          },
          items: [
            'tencent/appendix/useful-kubectl-for-tencent-cloud',
            'tencent/appendix/eks-annotations',
            'tencent/appendix/ingress-error-code',
          ],
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
        'appendix/kubectl-cheat-sheet',
        'appendix/yaml',
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
      ]
    }
  ],
};

module.exports = sidebars;
