import paramiko
import sys

HOST = '192.168.10.100'
USER = 'root'
PASSWORD = 'IB@Vschool123'
VM_ID = '200'
ISO_PATH = 'local:iso/ubuntu-22.04.5-live-server-amd64.iso'

def exe(ssh, cmd):
    print(f"\n[RUNNING] {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    
    if out: 
        print(f"  -> {out}")
    if err and "Use of uninitialized value" not in err: 
        print(f"  -> ERRO AVISO: {err}")

print(f"===========================================================")
print(f"  PONTOFACE - CRIAR VM DO COOLIFY (UBUNTU 22.04 LTS)")
print(f"  HOST: Proxmox {HOST} | VM ID: {VM_ID}")
print(f"===========================================================\n")

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print("Conectando com o Proxmox...")
    ssh.connect(HOST, username=USER, password=PASSWORD)
    print("Logado no root do Proxmox!\n")
    
    print("--- 1. DESTRUINDO A VM ANTIGA (Se existir) ---")
    exe(ssh, f"qm stop {VM_ID} || true")
    exe(ssh, f"qm destroy {VM_ID} --purge || true")
    
    print("\n--- 2. CRIANDO A NUVEM PODEROSA (24GB RAM, 8 CORES) ---")
    exe(ssh, f"qm create {VM_ID} --name Coolify-Mestre --memory 24576 --cores 8 --net0 virtio,bridge=vmbr0 --scsihw virtio-scsi-single")
    
    print("\n--- 3. ADICIONANDO HD (150 GB) E CD-ROM (ISO UBUNTU) ---")
    exe(ssh, f"qm set {VM_ID} --scsi0 local-lvm:150")
    exe(ssh, f"qm set {VM_ID} --ide2 {ISO_PATH},media=cdrom")
    
    print("\n--- 4. ORDEM DE BOOT ---")
    exe(ssh, f"qm set {VM_ID} --boot order=ide2;scsi0")
    
    print("\n--- 5. LIGANDO A MAQUINA! ---")
    exe(ssh, f"qm start {VM_ID}")
    
    print("\n")
    print("===========================================================")
    print(" [SUCESSO!] A VM FOI CRIADA E ESTA LIGADA!")
    print(" VA NO PAINEL DO PROXMOX -> VM 200 -> CONSOLE E INSTALE O OS")
    print("===========================================================")

except Exception as e:
    print(f"\nFalha Catastrófica: {str(e)}")
finally:
    ssh.close()
