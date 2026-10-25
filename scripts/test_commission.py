import subprocess, json, time

base = "http://localhost:3000"

def api(method, path, body=None):
    cmd = ["curl", "-s", "-X", method, f"{base}{path}"]
    if body:
        cmd += ["-H", "Content-Type: application/json", "-d", json.dumps(body)]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
    if r.stdout:
        return json.loads(r.stdout)
    return None

# Wait for server
for i in range(10):
    try:
        r = api("GET", "/api/tasks")
        if r and "tasks" in r:
            print(f"Server ready: {len(r['tasks'])} tasks")
            break
    except:
        pass
    time.sleep(2)
else:
    print("Server not ready!")
    exit(1)

# Find assigned task
tasks = api("GET", "/api/tasks")["tasks"]
assigned = [t for t in tasks if t.get("assignedToId") and t["status"] == "assigned"]
if not assigned:
    print("No assigned tasks found, creating one...")
    # Just test revenue on existing data
    rev = api("GET", "/api/admin/revenue")
    print(f"Revenue: {json.dumps(rev['revenue'], indent=2)}")
    exit(0)

task = assigned[0]
print(f"\nCompleting task: {task['title']} (fee: {task['fee']}₺)")
print(f"Expected commission (10%): {max(10, min(task['fee'] * 0.1, 500))}₺")
print(f"Expected net to tasker: {task['fee'] - max(10, min(task['fee'] * 0.1, 500))}₺")

time.sleep(1)
result = api("POST", "/api/admin", {
    "action": "task-status",
    "taskId": task["id"],
    "status": "completed"
})
print(f"\nCompletion result: success={result.get('success')}")

time.sleep(1)
rev = api("GET", "/api/admin/revenue")["revenue"]
print(f"\n--- Revenue Dashboard ---")
print(f"Total Platform Revenue: {rev['totalRevenue']}₺")
print(f"Commission Earned: {rev['totalCommissionEarned']}₺")
print(f"Platform Fees (escrow): {rev['totalPlatformFees']}₺")
print(f"Withdraw Fees: {rev['totalWithdrawFees']}₺")
print(f"Tasks with Commission: {rev['tasksWithCommission']}")
print(f"Avg Commission/Task: {rev['avgCommission']}₺")

if rev['recentRevenue']:
    print(f"\n--- Recent Revenue Transactions ---")
    for tx in rev['recentRevenue'][:5]:
        amt = tx['amount'] if tx['type'] == 'platform_commission' else tx.get('platformFee', 0)
        print(f"  {tx['type']}: +{amt}₺ - {tx.get('taskTitle', '-')[:50]}")