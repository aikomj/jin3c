---
title: AOP切面实现自定义redis分布式锁注解
author: 谨三思
date: 2025/04/02 10:00
isTop: false
categories:
 - Redis篇
tags:
 - 分布式锁

---

# AOP切面实现自定义redis分布式锁注解

 ## 1、实现代码

springboot项目

第一步，自定义注解 DistributedLock

```java
@Documented
@Target({ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
public @interface DistributedLock {
    long timeout() default 0L;

    TimeUnit timeUnit() default TimeUnit.SECONDS;

    String key() default "#methodName";

    boolean keyUseSpEL() default true;
}
```

第二步，定义切面处理类 RedisLockAspect

```java
@Order(-12)
@Aspect
public class RedisLockAspect {
    private final RedissonClient redissonClient;

    @Around("execution(public * *(..)) && @annotation(com.lightning.boot.redis.lock.annotations.DistributedLock)")
    public Object interceptor(ProceedingJoinPoint pjp) throws Throwable {
        MethodSignature signature = (MethodSignature)pjp.getSignature();
        Method method = signature.getMethod();
        Parameter[] parameters = method.getParameters();
        DistributedLock distributedLock = (DistributedLock)method.getAnnotation(DistributedLock.class);
        String key = distributedLock.key();
        if (distributedLock.keyUseSpEL()) {
            Object[] args = pjp.getArgs();
            key = this.spelParser(parameters, args, distributedLock.key(), pjp.getTarget(), method);
        }

        RLock rLock = this.redissonClient.getLock(key);

        Object result;
        try {
            if (distributedLock.timeout() > 0L) {
                rLock.lock(distributedLock.timeout(), distributedLock.timeUnit());
            } else {
                rLock.lock();
            }

            result = pjp.proceed();
        } finally {
            rLock.unlockAsync();
        }

        return result;
    }

    public String spelParser(Parameter[] parameters, Object[] args, String spel, Object targetObject, Method method) {
        ExpressionParser parser = new SpelExpressionParser();
        Expression expression = parser.parseExpression("'DISTRIBUTED_LOCK_KEY_'+" + spel);
        StandardEvaluationContext context = new StandardEvaluationContext();

        for(int i = 0; i < parameters.length; ++i) {
            context.setVariable(parameters[i].getName(), args[i]);
        }

        context.setVariable("targetClass", targetObject.getClass());
        String var10002 = targetObject.getClass().getName();
        context.setVariable("methodName", var10002 + "." + method.getName());
        context.setVariable("method", method);
        return expression.getValue(context).toString();
    }

    // 注入Spring容器 切面类实例
    @Autowired
    public RedisLockAspect(RedissonClient redissonClient) {
        this.redissonClient = redissonClient;
    }
}
```

第三步，Redis连接的配置类

```java
import org.redisson.Redisson;
import org.redisson.api.RedissonClient;
import org.redisson.config.ClusterServersConfig;
import org.redisson.config.Config;
import org.redisson.config.SentinelServersConfig;
import org.redisson.config.SingleServerConfig;

@Configuration
public class RedisListenerConfig {
    private static final Logger log = LoggerFactory.getLogger(RedisListenerConfig.class);

    public RedisListenerConfig() {
    }

    @Bean
    @ConditionalOnClass({RedisProperties.class})
    public Config redissonConfig(RedisProperties redisProperties) {
        Config config = new Config();
        String redisLink = "redis://%s";
        if (redisProperties.isSsl()) {
            redisLink = "rediss://%s";
        }

        if (redisProperties.getCluster() != null) {
            Cluster cluster = redisProperties.getCluster();
            ((ClusterServersConfig)((ClusterServersConfig)config.useClusterServers().setPassword(redisProperties.getPassword())).setConnectTimeout(redisProperties.getTimeout().toMillisPart())).addNodeAddress(this.convertAddress(redisLink, cluster.getNodes()));
            return config;
        } else if (redisProperties.getSentinel() != null) {
            Sentinel sentinel = redisProperties.getSentinel();
            ((SentinelServersConfig)((SentinelServersConfig)config.useSentinelServers().setPassword(redisProperties.getPassword())).setConnectTimeout(redisProperties.getTimeout() != null ? redisProperties.getTimeout().toMillisPart() : 10000)).setMasterName(sentinel.getMaster()).setSentinelPassword(sentinel.getPassword()).setDatabase(redisProperties.getDatabase()).addSentinelAddress(this.convertAddress(redisLink, sentinel.getNodes()));
            return config;
        } else {
            SingleServerConfig var10000 = (SingleServerConfig)config.useSingleServer().setPassword(redisProperties.getPassword());
            Object[] var10002 = new Object[1];
            String var10005 = redisProperties.getHost();
            var10002[0] = var10005 + ":" + redisProperties.getPort();
            ((SingleServerConfig)var10000.setAddress(String.format(redisLink, var10002)).setConnectTimeout(redisProperties.getTimeout() != null ? redisProperties.getTimeout().toMillisPart() : 10000)).setDatabase(redisProperties.getDatabase());
            return config;
        }
    }

    @Bean
    @ConditionalOnClass({Config.class})
    public RedissonClient redissonClient(Config redissonConfig) {
        return Redisson.create(redissonConfig);
    }

    @Bean
    @ConditionalOnClass({RedissonClient.class})
    public RedisLockAspect redisLockAspect(RedissonClient redissonClient) {
        return new RedisLockAspect(redissonClient);
    }

    private String[] convertAddress(String baseUrl, List<String> configUrl) {
        return (String[])configUrl.stream().map((s) -> {
            return String.format(baseUrl, s);
        }).toArray((x$0) -> {
            return new String[x$0];
        });
    }
}
```

第四步，业务层方法使用@DistributedLock注解

```java
	/**
	 * 暂存停工计划申请
	 * @param applyVO 申请单数据
	 * @param user 登录用户
	 * @param entrance 创建入口，1-停复工模块，2-批量调整模块，默认1
	 * @return
	 */
	@Override
	@DistributedLock(key = "#applyVO.projectId")
	public Map<String, Object> submit(WorkResumeDetailVO applyVO, LoginAccountVO user,Integer entrance) {
		// 1、校验
		Assert.isTrue(Objects.equals(applyVO.getType(),ResumeApplyTypeEnum.APPLY_RESUME_PLAN) || Objects.equals(applyVO.getType(),ResumeApplyTypeEnum.DELAY_RESUME),"申请单类型错误");
		checkApply(applyVO);
		// 2、调用文件服务绑定附件
		boolean addFlag = false;
		if(Objects.isNull(applyVO.getApplyId())){
			applyVO.setApplyId(IdWorker.getIdStr(applyVO));
			addFlag = true;
		}
		bindApplyFiles(applyVO);
		// 3、保存数据
		String flowTitle = String.format("%s停复工计划申请流程",applyVO.getProjectName());
		applyVO.setFlowTitle(flowTitle);
		applyVO.setBusinessId(applyVO.getApplyId());
		saveApply(applyVO,addFlag,entrance);
		// 返回申请单id
		Map<String,Object> map = new HashMap<>(2);
		map.put("applyId",applyVO.getApplyId());
		return map;
	}
```

