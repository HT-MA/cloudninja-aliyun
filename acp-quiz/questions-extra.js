// 云忍者 — 2026 阿里云 ACP 大纲缺失考点补充题库
// 覆盖：文件存储NAS、云原生数据库PolarDB、经典网络 vs 专有网络VPC、
//       成本优化（节省计划/抢占式/共享带宽）、云监控、云安全（WAF/DDoS/堡垒机/KMS）
// 格式与 questions-data.js / questions-rds.js 保持一致：
// {id, module, type, question, options, answer[], explanation, ref}
// type: single 单选 / multi 多选 / judge 判断；answer 为正确选项索引数组

const EXTRA_TOPIC_QUESTIONS = [
  /* ===================== 文件存储 NAS ===================== */
  {id:'nas01', module:'文件存储NAS', type:'single',
   question:'阿里云文件存储 NAS（NAS）的主要特性是？',
   options:['提供块存储，需格式化为磁盘后挂载到单台 ECS','提供文件存储，支持 NFS/SMB 协议，多台 ECS 可同时挂载共享访问','是对象存储，通过 HTTP API 访问，不支持文件接口','仅支持单台 ECS 独占挂载，不支持并发访问'],
   answer:[1],
   explanation:'NAS 是文件级存储服务，支持 NFS（Linux）和 SMB（Windows）协议，多台 ECS 可同时挂载同一文件系统、共享访问同一份数据，适合企业级共享文件、容器持久化等场景。它与 OSS（对象存储）、云盘（块存储）定位不同。',
   ref:'help.aliyun.com/zh/nas/产品简介/'},

  {id:'nas02', module:'文件存储NAS', type:'multi',
   question:'关于 NAS 与云盘（块存储）、OSS（对象存储）的区别，以下说法正确的有哪些？',
   options:['云盘是块存储，需格式化后挂载到单台实例，无法多台共享','OSS 是对象存储，通过 RESTful API/SDK 访问，不适合频繁小文件随机读写','NAS 支持多台计算节点并发挂载，适合共享文件与容器存储','三者性能完全相同，可以任意替换使用'],
   answer:[0,1,2],
   explanation:'云盘（块存储）挂载单实例、不能多实例共享；OSS 对象存储适合海量非结构化数据、通过 API 访问、不适合作为文件系统直接挂载；NAS 文件存储支持多节点共享挂载。三者定位不同，不能简单替换。',
   ref:'help.aliyun.com/zh/nas/产品简介/基本概念/'},

  {id:'nas03', module:'文件存储NAS', type:'single',
   question:'某业务需要将一个文件系统同时挂载到同一 VPC 内多台 ECS 并通过 NFS 共享访问，最合适的是？',
   options:['云盘','文件存储 NAS','对象存储 OSS','本地 SSD'],
   answer:[1],
   explanation:'NAS 支持多台 ECS 同时挂载并共享访问，且提供标准文件系统接口（NFS/SMB），完美契合「多实例共享同一份文件」的需求。云盘只能单实例挂载。',
   ref:'help.aliyun.com/zh/nas/'},

  {id:'nas04', module:'文件存储NAS', type:'single',
   question:'关于 NAS 的挂载点（Mount Target），以下说法正确的是？',
   options:['挂载点必须与应用 ECS 在同一可用区','挂载点位于 VPC 内，ECS 通过挂载点域名访问文件系统','挂载点只能在公网访问，跨地域可用','一个文件系统只能创建一个挂载点'],
   answer:[1],
   explanation:'NAS 的挂载点是文件系统在 VPC 内的访问入口，ECS 通过该挂载点域名（或 IP）挂载访问；挂载点与 ECS 在同一 VPC 即可，不强制同可用区；支持多挂载点以实现多网络环境访问。',
   ref:'help.aliyun.com/ *产品简介/挂载点'},

  /* ===================== 云原生数据库 PolarDB ===================== */
  {id:'pol01', module:'云原生数据库PolarDB', type:'single',
   question:'阿里云 PolarDB（云原生数据库）的核心架构特点是？',
   options:['计算与存储分离，共享分布式存储，一写多读','计算与存储耦合，单节点架构','仅支持单机部署，不支持扩展','完全基于 Hadoop 架构'],
   answer:[0],
   explanation:'PolarDB 采用计算与存储分离架构：上层多个计算节点（一写多读，最多可扩展至 15 个只读节点）共享底层分布式存储（PolarStore），存储容量最高可达 100 TB，并支持 STANDBY/Switch 快速切换。',
   ref:'help.aliyun.com/zh/polardb/产品简介/产品架构/'},

  {id:'pol02', module:'云原生数据库PolarDB', type:'multi',
   question:'关于 PolarDB 与 RDS 的差异，以下说法正确的有哪些？',
   options:['PolarDB 存储与计算分离，存储可弹性扩展至 100TB，RDS 受单实例规格限制','PolarDB 内置一写多读，RDS 需借助只读实例实现读扩展','PolarDB 100% 兼容 PostgreSQL、MySQL、Oracle 等主流引擎','PolarDB 不支持高可用，RDS 才支持'],
   answer:[0,1,2],
   explanation:'PolarDB 计算存储分离、存储可达 100TB、内置一写多读架构、兼容 MySQL/PostgreSQL/Oracle 引擎；两者都提供高可用能力，因此选项D错误。PolarDB 在大规模、高并发、弹性场景更具优势。',
   ref:'help.aliyun.com/zh/polardb/产品简介/产品优势/'},

  {id:'pol03', module:'云原生数据库PolarDB', type:'single',
   question:'PolarDB 的「一写多读」架构中，多个只读节点如何获取最新数据？',
   options:['每个只读节点各自独立存储全量数据','只读节点共享同一份底层存储，通过日志回放保持同步','只读节点通过主节点实时推送 Binlog 复制','只读节点只能读取创建时的快照'],
   answer:[1],
   explanation:'PolarDB 所有计算节点共享同一份分布式存储（PolarStore），只读节点通过回放存储层的 Redo 日志保持与主节点近乎实时的同步，因此读扩展能力强、一致性好，且不依赖主备复制链路。',
   ref:'help.aliyun.com/zh/polardb/产品简介/产品架构/'},

  {id:'pol04', module:'云原生数据库PolarDB', type:'single',
   question:'业务需要单库支撑百万级 QPS 并支持弹性扩展只读能力，优先推荐？',
   options:['单机 MySQL','PolarDB 一写多读集群','传统 RDS 单实例','本地数据库'],
   answer:[1],
   explanation:'PolarDB 一写多读集群支持横向扩展多个只读节点，配合共享存储与并行查询，可支撑百万级 QPS 的高并发场景，并支持弹性升降配，是大规模高并发业务的首选。',
   ref:'help.aliyun.com/zh/polardb/'},

  /* ===================== 经典网络 vs 专有网络 VPC ===================== */
  {id:'vpc01', module:'专有网络VPC', type:'multi',
   question:'关于经典网络与专有网络 VPC 的区别，以下说法正确的有哪些？',
   options:['经典网络是阿里云早期多租户共享的网络，隔离性较弱','VPC 是用户独享的私有网络，可自定义网段、路由与二层隔离','VPC 内的资源默认隔离，需显式配置才能互通公网或跨 VPC','经典网络已逐步下线，新建资源默认使用 VPC'],
   answer:[0,1,2,3],
   explanation:'经典网络为多租户共享、隔离性弱、不可自定义；VPC 是用户独占的私有网络，可自定义 CIDR、子网、路由表，默认二层隔离，需通过 NAT/对等连接/云企业网实现互通。新建资源已默认使用 VPC，经典网络正在逐步退出。',
   ref:'help.aliyun.com/zh/vpc/产品简介/什么是专有网络/'},

  {id:'vpc02', module:'专有网络VPC', type:'single',
   question:'VPC 内的 ECS 需要访问公网但又希望多个 ECS 共享一个公网出口并隐藏私网地址，应部署？',
   options:['安全组','NAT 网关','负载均衡 SLB','VPN 网关'],
   answer:[1],
   explanation:'NAT 网关为 VPC 内多台无公网 IP 的 ECS 提供统一的公网出口（SNAT），实现共享上网并隐藏私网地址；SNAT 用于出方向、DNAT 用于入方向端口映射。',
   ref:'help.aliyun.com/zh/vpc/用户指南/NAT网关/'},

  {id:'vpc03', module:'专有网络VPC', type:'single',
   question:'两个位于不同地域的 VPC 需要互通，且希望低延迟、安全稳定，推荐方案是？',
   options:['公网 IP 直接互通','云企业网 CEN（Cloud Enterprise Network）','经典网络互联','仅通过 NAT 网关'],
   answer:[ 1],
   explanation:'云企业网 CEN 可快速打通跨地域、跨 VPC 的网络，提供低延迟、安全的私网互通，是企业级多地域组网的核心产品。公网互通不安全且延迟高，NAT 主要用于出公网。',
   ref:'help.aliyun.com/zh/cen/'},

  {id:'vpc04', module:'专有网络VPC', type:'single',
   question:'弹性公网 IP（EIP）的主要特征是？',
   options:['绑定到一台 ECS 后无法解绑','可独立购买、动态绑定/解绑到 ECS/NAT/SLB，支持按需使用','仅在创建 ECS 时分配，不能单独存在','只能绑定到同一可用区资源'],
   answer:[1],
   explanation:'EIP 是独立的公网 IP 资源，可灵活绑定到 ECS、NAT 网关、SLB、NAT 等，支持动态绑定与解绑，按需使用并计费，适合需要灵活公网能力的场景。',
   ref:'help.aliyun.com/zh/vpc/用户指南/弹性公网IP/'},

  /* ===================== 成本优化 ===================== */
  {id:'cost01', module:'成本优化', type:'single',
   question:'为长期稳定运行的 ECS 降低费用，最合适的方式是？',
   options:['始终使用按量付费','使用包年包月（预付费）锁定稳定基线负载','使用抢占式实例承载核心数据库','不使用预留，全部按量'],
   answer:[1],
   explanation:'包年包月（预付费）相比按量付费有明显折扣，适合长期稳定运行的基线资源；抢占式实例价格极低但可能被回收，仅适合无状态、容错的批量任务，不适合核心数据库。',
   ref:'help.aliyun.com/zh/ecs/计费/包年包月/'},

  {id:'cost02', module:'成本优化', type:'multi',
   question:'关于阿里云「节省计划」（Savings Plan）与「预留实例」，以下说法正确的有哪些？',
   options:['节省计划按承诺消费金额抵扣按量实例账单，比按量更优惠','预留实例（预留实例券）可抵扣按量实例费用','两者都要求提前承诺使用期限以获得折扣','节省计划只能用于单一规格实例，无法跨规格抵扣'],
   answer:[0,1,2],
   explanation:'节省计划与预留实例都是通过预先承诺获得折扣、抵扣按量实例费用的方式，适合长期稳定负载；节省计划按「承诺每小时消费」抵扣，并不直接绑定具体实例，可按家族/地域灵活抵扣，因此「只能单一规格」说法错误。',
   ref:'help.aliyun.com/zh/ecs/计费/节省计划/'},

  {id:'cost03', module:'成本优化', type:'single',
   question:'某业务有大量可中断、无状态的批量计算任务，希望最大化性价比，应优先使用？',
   options:['包年包月实例','抢占式实例（Spot）','高可用版 RDS','独享型实例'],
   answer:[1],
   explanation:'抢占式实例价格通常为按量的 10% 左右，但可能被系统回收，适合可中断、无状态、容错的批处理/渲染/CI 场景。关键业务不应使用。',
   ref:'help.aliyun.com/zh/ecs/实例/抢占式实例/'},

  {id:'cost04', module:'成本优化', type:'multi',
   question:'关于「共享带宽」与「共享流量包」节省公网成本，以下说法正确的有哪些？',
   options:['共享带宽让多个 EIP 共享一个带宽上限，避免各自购买峰值带宽','共享流量包可抵扣多款产品（ECS/EIP/NAT）的流量费用','共享带宽按带宽计费，适合多 IP 出网流量波动较大的场景','共享带宽只能绑定单一 EIP'],
   answer:[0,1,2],
   explanation:'共享带宽将多个 EIP 绑定到一个带宽包，共享带宽上限，降低整体成本；共享流量包按流量抵扣多种产品流量。两者都是公网成本优化手段，且均可绑定多个 IP，因此「只能单一 EIP」错误。',
   ref:'help.aliyun.com/zh/vpc/用户指南/共享带宽/'},

  {id:'cost05', module:'成本优化', type:'judge',
   question:'弹性伸缩（ESS）配合按量付费，可在业务低谷自动释放多余实例，从而节省计算成本，是典型的高可用+成本优化实践。',
   options:['正确','错误'],
   answer:[0],
   explanation:'弹性伸缩按业务负载（CPU、请求量、定时）自动增减 ECS 实例，配合按量付费在低谷释放冗余实例，既保障高峰期性能又降低空闲成本，是云上成本优化的核心实践。',
   ref:'help.aliyun.com/zh/ess/'},

  /* ===================== 云监控 ===================== */
  {id:'mon01', module:'云计算通用', type:'single',
   question:'阿里云云监控（CloudMonitor）可监控的对象包括？',
   options:['仅 ECS 的 CPU 使用率','ECS、RDS、SLB、OSS 等多种云资源的指标（如 CPU、内存、连接数、延迟）','仅自定义日志，不提供指标监控','仅网络流量，不含实例级指标'],
   answer:[1],
   explanation:'云监控可采集 ECS、RDS、SLB、OSS、Redis 等云产品的指标（CPU、内存、连接数、带宽、延迟等），并提供主机监控、站点监控、自定义监控与告警。',
   ref:'help.aliyun.com/zh/cms/'},

  {id:'mon02', module:'云计算通用', type:'multi',
   question:'关于云监控的告警机制，以下说法正确的有哪些？',
   options:['可基于阈值（如 CPU>80%）触发告警','告警可通过短信、邮件、钉钉、Webhook 等渠道通知','可配置告警联系人组与静默期','监控数据只能查看不能告警'],
   answer:[0,1, 2],
   explanation:'云监控支持基于阈值的告警规则，触发后可通过短信、邮件、电话、钉钉、Webhook 等通知，并可配置联系人组、沉默周期等，帮助及时发现异常。',
   ref:'help.aliyun.com/zh/cms/告警服务/'},

  {id:'mon03', module:'云计算通用', type:'single',
   question:'希望在应用层自定义一个「订单量每秒」指标并由云监控采集告警，应使用？',
   options:['基础监控','自定义监控（上报自定义指标）','主机监控','事件监控'],
   answer:[1],
   explanation:'自定义监控允许用户通过 API/SDK 上报业务自定义指标（如订单量、队列长度），并进行监控与告警，弥补基础监控无法覆盖的业务维度指标。',
   ref:'help.aliyun.com/zh/cms/自定义监控/'},

  /* ===================== 云安全（WAF/DDoS/堡垒机/KMS） ===================== */
  {id:'sec01', module:'云安全', type:'single',
   question:'阿里云 Web 应用防火墙（WAF）的主要作用是？',
   options:['加速网站访问','防护 SQL 注入、XSS、CC 等 Web 攻击，保护应用层安全','提供 DDoS 流量清洗','管理主机账号'],
   answer:[1],
   explanation:'WAF 部署在网站/应用前端，防护 SQL 注入、XSS、CC 攻击、 Webshell 等 Web 层威胁，支持域名接入与透明代理模式。DDoS 清洗由 DDoS 防护（高防）负责。',
   ref:'help.aliyun.com/zh/waf/'},

  {id:'sec02', module:'云安全', type:'multi',
   question:'关于 DDoS 防护，以下说法正确的有哪些？',
   options:['阿里云提供免费的基础 DDoS 防护（默认开启，有清洗阈值）','DDoS 高防（Anti-DDoS Pro）可提供 T 级清洗能力，应对大流量攻击','黑洞策略会在攻击超阈值时将 IP 拉入黑洞引流','DDoS 防护只对公网 IP 生效，内网不受影响'],
   answer:[0,1,2],
   explanation:'阿里云默认提供基础 DDoS 防护（有阈值），高防提供大流量清洗；当攻击超过阈值可能触发黑洞（丢弃该 IP 流量）。DDoS 防护主要针对公网 IP 与域名，内网流量一般不涉及公网攻击面。',
   ref:'help.aliyun.com/zh/ddos/'},

  {id:'sec03', module:'云安全', type:'single',
   question:'运维人员需要通过统一入口安全访问多台 ECS，并留存操作审计记录，应选用？',
   options:['负载均衡','堡垒机（运维审计）','NAT 网关','VPN 网关'],
   answer:[1],
   explanation:'堡垒机（运维审计系统）提供统一的运维入口，对 SSH/RDP 等协议进行代理、权限控制与全程操作审计（录屏、命令审计），满足合规与安全问题追溯需求。',
   ref:'help.aliyun.com/zh/bastionhost/'},

  {id:'sec04', module:'云安全', type:'single',
   question:'对云上敏感数据进行密钥管理与信封加密，应使用？',
   options:['RAM 访问控制','密钥管理服务 KMS','安全组','WAF'],
   answer:[1],
   explanation:'KMS（密钥管理服务）负责密钥的生命周期管理与信封加密，可为 ECS 磁盘、OSS、RDS TDE、PolarDB 等提供加密密钥，并支持 BYOK。RAM 用于权限控制，不负责密钥生命周期。',
   ref:'help.aliyun.com/zh/kms/'},

  {id:'sec05', module:'云安全', type:'multi',
   question:'关于 RAM（资源访问管理）的权限最佳实践，以下说法正确的有哪些？',
   options:['遵循最小权限原则，按需授权','为不同业务创建子账号并分配角色，避免使用主账号密钥','可使用 Policy 精确控制可访问的资源与操作','主账号 AccessKey 可直接嵌入应用代码中方便调用'],
   answer:[0,1,2],
   explanation:'RAM 最佳实践强调最小权限、使用子账号/RAM 角色、通过 Policy 精细授权；主账号 AccessKey 权限过大且泄露风险高，不应硬编码到应用代码中，推荐使用 RAM 角色（STS）。',
   ref:'help.aliyun.com/zh/ram/'},
];
