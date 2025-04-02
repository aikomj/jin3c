---
title: 个人常用 SQL 函数
author: 谨三思
date: 2025/02/16 15:43
isTop: true
categories:
 - MySQL篇
tags:
 - SQL函数
---

# 个人常用 SQL 函数 <Badge text="持续更新" type="warning" />

## 1、时间函数

### 获取当前时间（MySQL）

```sql
# 输出格式为：yyyy-MM-dd HH:mm:ss
NOW();
```

### 获取当前时间秒（MySQL）

```sql
# 从 1970年1月1日 开始到现在的秒数
UNIX_TIMESTAMP();
```

### 计算两个时间之间的间隔（MySQL）

```sql
# unit 可选为FRAC_SECOND 毫秒、SECOND 秒、MINUTE 分钟、HOUR 小时、DAY 天、WEEK 星期、MONTH 月、QUARTER 季度、YEAR 年
TIMESTAMPDIFF(unit, datetime_expr1, datetime_expr2)
```

## 2、字符串函数

### 拼接字符串（MySQL）

```sql
# 将多个字符串拼接在一起
CONCAT(str1, str2, ...)
```

::: tip 笔者说
这个函数看起来平平无奇，但实际用起来，可不只是真香。你可能会在 MyBatis 中解决 SQL 注入的时候用到它，还可能在一些 “奇怪” 的场景用到它。
:::

#### 清空数据库中的所有表数据

清空单表数据很简单。

```sql
TRUNCATE TABLE 表名;
```

但是，如果现在有 100 + 张表？你当然不会一个一个的去 `TRUNCATE`，但 MySQL 又没有提供该功能。那你可以用用下面的方法。

1. 查询该数据库下的所有表，利用 `CONCAT()` 函数将 `TRUNCATE` 语句拼接起来

   ```shell
   SELECT
     CONCAT('TRUNCATE TABLE ', TABLE_NAME, ';')
   FROM 
     information_schema.TABLES
   WHERE TABLE_SCHEMA = '数据库名';
   ```

2. 将执行结果复制，直接执行即可

#### 删除数据库中的所有表

删除单表很简单。

```sql
DROP TABLE 表名;
```

但是，如果现在有 100 + 张表？你当然不会一个一个的去 `DROP`，但 MySQL 又没有提供该功能。那你可以用用下面的方法。

1. 查询该数据库下的所有表，利用 `CONCAT()` 函数将 `DROP` 语句拼接起来

   ```shell
   SELECT
     CONCAT('DROP TABLE IF EXISTS ', TABLE_NAME, ';')
   FROM 
     information_schema.TABLES
   WHERE TABLE_SCHEMA = '数据库名';
   ```

2. 将执行结果复制，直接执行即可

## 3、窗口函数

### over函数

```sql
-- 基本语法
窗口函数名([参数]) OVER (
    [PARTITION BY 列]
    [ORDER BY 列 [ASC|DESC]]
    [ROWS|RANGE 窗口框架]
)
-- PARTITION BY 将数据分为多个行，类似group by 但保留所有行，每个分区独立计算
-- ORDER BY 分区内数据的排序方式,如果省略ORDER BY，那么窗口可能包含所有行，或者取决于框架的定义
-- ROWS|RANGE 定义窗口的范围,ROWS是基于物理行,而RANGE是基于逻辑值，比如ORDER BY的列的值范围
-- RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW，从分区的开始到当前行
-- RANGE BETWEEN 1 PRECEDING AND 1 FOLLOWING, 根据当前行的值，取前后各一个值的范围
-- 1、每个员工的薪水在部门的排名
select employee_id,salary,department_id,rank() over(partition by department_id order by salary desc) as dept_rank
from employee;

-- 2、分组计算每行的序号
select ROW_NUMBER() over(partition by department_id order by create_time asc)

-- 省略partition by,那么整个结果集作为一个分区
-- 3、计算每个月的累计销售额
-- rows between unbounded preceding and current row 分区的开始到当前行
select month,sales,sum(salse) over(order by month rows between unbounded preceding and current row) as cumulative_salse
from sales_data

-- 4、计算每个销售额占总销售额的比例
-- 这里SUM(sales) OVER () 会计算所有行的总和，因为没有PARTITION BY和ORDER BY，所以整个表作为一个分区，总和就是总销售额。
SELECT
product,
sales,
sales / SUM(sales) OVER () AS sales_percentage
FROM sales;

-- 5、查询每个部门内薪水的排名，以及每个员工的薪水与部门平均薪水的差异
SELECT
department_id,
employee_id,
salary,
RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS dept_rank,
AVG(salary) OVER (PARTITION BY department_id) AS dept_avg_salary,
salary - AVG(salary) OVER (PARTITION BY department_id) AS salary_diff
FROM employees;

-- 6、计算每个月的销售额以及过去三个月的平均销售额（移动平均）
SELECT
month,
sales,
AVG(sales) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS moving_avg
FROM sales_data
ORDER BY month;
-- ROWS BETWEEN 2 PRECEDING AND CURRENT ROW 前两行到当前行，

-- 6、LEAD和LAG函数也属于窗口函数，它们可以访问当前行之前或之后的行
-- 每个员工的上一个入职日期，按入职日期排序
employee_id,
hire_date,
LAG(hire_date) OVER (ORDER BY hire_date) AS previous_hire_date  -- 当前行的上一个入职日期
FROM employees;

-- 7、order by 之后默认框架就是从开始行到当前行
```

