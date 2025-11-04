from scapy.all import sniff, conf  
from scapy.layers.dot11 import Dot11

conf.use_pcap=True

def iface():
    ifaces = conf.ifaces
    wifi_iface = [i for i in ifaces if "eth4" in i][0] # Example: finds first wireless interface
    return wifi_iface.data['eth4'].ip


def callBack(pkg): 
    conf.iface.setmonitor(True)
    if pkg.haslayer(Dot11) and pkg.type == 0 and pkg.subtype == 8:
            print("dBm_AntSignal", pkg.dBm_AntSignal)
            print("dBm_AntNoise", pkg.dBm_AntNoise)
            
sniff(iface=iface, prn=callBack)
