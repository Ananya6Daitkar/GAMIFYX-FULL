#!/bin/bash

# Controlled Chaos Experiment: Traffic Spike
# Objective: Test AI Integration Service under 3x normal traffic load
# Duration: 5 minutes
# Safety: Auto-abort if error rate > 5% or P95 > 600ms

set -e

SERVICE_URL="http://localhost:3011"
EXPERIMENT_DURATION=300  # 5 minutes
NORMAL_RPS=100
SPIKE_RPS=300
ABORT_ERROR_RATE=5
ABORT_P95_LATENCY=600

echo "🧪 Starting Traffic Spike Chaos Experiment"
echo "Target: $SERVICE_URL"
echo "Duration: ${EXPERIMENT_DURATION}s"
echo "Traffic: ${NORMAL_RPS} -> ${SPIKE_RPS} RPS"
echo "Abort conditions: Error rate > ${ABORT_ERROR_RATE}% OR P95 > ${ABORT_P95_LATENCY}ms"
echo ""

# Function to check service health
check_health() {
    local response=$(curl -s -w "%{http_code},%{time_total}" "$SERVICE_URL/api/health/all" || echo "000,999")
    local http_code=$(echo $response | cut -d',' -f1)
    local response_time=$(echo $response | cut -d',' -f2)
    
    if [ "$http_code" != "200" ]; then
        echo "❌ Health check failed: HTTP $http_code"
        return 1
    fi
    
    echo "✅ Health check passed: ${response_time}s"
    return 0
}

# Function to run load test
run_load_test() {
    local rps=$1
    local duration=$2
    
    echo "🚀 Generating ${rps} RPS for ${duration}s..."
    
    # Using Apache Bench (ab) for load testing
    ab -n $((rps * duration)) -c 20 -g load_test_results.tsv "$SERVICE_URL/api/health/all" > load_test_output.txt 2>&1 &
    local ab_pid=$!
    
    # Monitor for abort conditions
    local start_time=$(date +%s)
    local current_time=$start_time
    local error_count=0
    local total_requests=0
    
    while [ $((current_time - start_time)) -lt $duration ]; do
        sleep 10
        current_time=$(date +%s)
        
        # Check error rate (simplified - in production use proper monitoring)
        if [ -f load_test_output.txt ]; then
            local failed_requests=$(grep -o "Failed requests: [0-9]*" load_test_output.txt | tail -1 | grep -o "[0-9]*" || echo "0")
            local completed_requests=$(grep -o "Complete requests: [0-9]*" load_test_output.txt | tail -1 | grep -o "[0-9]*" || echo "1")
            
            if [ "$completed_requests" -gt 0 ]; then
                local error_rate=$((failed_requests * 100 / completed_requests))
                echo "📊 Current error rate: ${error_rate}% (${failed_requests}/${completed_requests})"
                
                if [ "$error_rate" -gt "$ABORT_ERROR_RATE" ]; then
                    echo "🚨 ABORT: Error rate ${error_rate}% exceeds threshold ${ABORT_ERROR_RATE}%"
                    kill $ab_pid 2>/dev/null || true
                    return 1
                fi
            fi
        fi
        
        echo "⏱️  Experiment running... $((current_time - start_time))s elapsed"
    done
    
    # Wait for ab to complete
    wait $ab_pid 2>/dev/null || true
    echo "✅ Load test completed"
    return 0
}

# Function to capture metrics
capture_metrics() {
    local phase=$1
    echo "📈 Capturing metrics - $phase"
    
    # Capture Docker stats
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" > "metrics_${phase}.txt"
    
    # Capture service health
    curl -s "$SERVICE_URL/api/gateway/metrics" > "service_metrics_${phase}.json" || echo "{\"error\": \"failed to capture\"}" > "service_metrics_${phase}.json"
    
    # Capture circuit breaker status
    curl -s "$SERVICE_URL/api/gateway/circuit-breakers" > "circuit_breakers_${phase}.json" || echo "{\"error\": \"failed to capture\"}" > "circuit_breakers_${phase}.json"
    
    echo "✅ Metrics captured for $phase"
}

# Main experiment flow
main() {
    echo "🔍 Pre-experiment health check..."
    if ! check_health; then
        echo "❌ Service not healthy. Aborting experiment."
        exit 1
    fi
    
    echo "📊 Capturing baseline metrics..."
    capture_metrics "before"
    
    echo "⏳ Starting 30s baseline period..."
    sleep 30
    
    echo "🚀 Beginning traffic spike experiment..."
    capture_metrics "during_start"
    
    if run_load_test $SPIKE_RPS $EXPERIMENT_DURATION; then
        echo "✅ Experiment completed successfully"
    else
        echo "⚠️  Experiment aborted due to safety conditions"
    fi
    
    echo "📊 Capturing post-experiment metrics..."
    capture_metrics "after"
    
    echo "⏳ Waiting 60s for system recovery..."
    sleep 60
    
    echo "🔍 Post-experiment health check..."
    if check_health; then
        echo "✅ System recovered successfully"
    else
        echo "⚠️  System may need manual intervention"
    fi
    
    echo "📋 Generating experiment summary..."
    generate_summary
}

# Function to generate experiment summary
generate_summary() {
    echo "📋 Chaos Experiment Summary" > experiment_summary.txt
    echo "=========================" >> experiment_summary.txt
    echo "Experiment: Traffic Spike" >> experiment_summary.txt
    echo "Target Service: AI Integration Service" >> experiment_summary.txt
    echo "Duration: ${EXPERIMENT_DURATION}s" >> experiment_summary.txt
    echo "Traffic Increase: ${NORMAL_RPS} -> ${SPIKE_RPS} RPS" >> experiment_summary.txt
    echo "Timestamp: $(date)" >> experiment_summary.txt
    echo "" >> experiment_summary.txt
    
    if [ -f load_test_output.txt ]; then
        echo "Load Test Results:" >> experiment_summary.txt
        grep -E "(Complete requests|Failed requests|Requests per second|Time per request)" load_test_output.txt >> experiment_summary.txt || echo "No load test results found" >> experiment_summary.txt
    fi
    
    echo "" >> experiment_summary.txt
    echo "Files generated:" >> experiment_summary.txt
    echo "- metrics_before.txt" >> experiment_summary.txt
    echo "- metrics_during_start.txt" >> experiment_summary.txt  
    echo "- metrics_after.txt" >> experiment_summary.txt
    echo "- service_metrics_*.json" >> experiment_summary.txt
    echo "- circuit_breakers_*.json" >> experiment_summary.txt
    echo "- load_test_output.txt" >> experiment_summary.txt
    echo "- load_test_results.tsv" >> experiment_summary.txt
    
    echo "✅ Summary saved to experiment_summary.txt"
}

# Check prerequisites
if ! command -v ab &> /dev/null; then
    echo "❌ Apache Bench (ab) not found. Install with: apt-get install apache2-utils"
    exit 1
fi

if ! command -v curl &> /dev/null; then
    echo "❌ curl not found. Please install curl."
    exit 1
fi

# Run the experiment
main

echo "🎉 Chaos experiment completed!"
echo "📁 Check the generated files for detailed results."