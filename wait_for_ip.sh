for i in {1..30}; do
  if qm agent 200 ping 2>/dev/null; then
    echo "Agent Ready"
    qm agent 200 network-get-interfaces
    break
  fi
  echo "Waiting for guest agent ($i/30)..."
  sleep 5
done
