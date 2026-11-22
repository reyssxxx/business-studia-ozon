S=["Пессимистичный","Основной","Оптимистичный"]
P=dict(
 orders_scope=[8e6]*3,          # заказов одежды, обуви, аксессуаров в охвате / мес
 adoption=[0.05,0.15,0.20],
 conv_uplift=[0.05,0.12,0.20],    # прирост заказов у примерявших, отн.
 cannib=[0.10,0.05,0.0],
 look_rate=[0.03,0.06,0.10],      # доп. вещей из «Собрать образ» на заказ с примеркой
 look_price=[2000]*3,
 size_cut=[0.04,0.10,0.15], buyout=[0.65]*3, size_share=[0.5]*3,
 price=[3500]*3, take=[0.52]*3, var_cost=[0]*3, ret_cost=[0]*3,
 pics=[2]*3, tryon_conv=[0.08,0.12,0.15], gens_per_order=[2/0.08,2/0.12,2/0.15], cache=[0.0,0.0,0.0], gen_cost=[3.0,1.5,0.8],
 sku=[0]*3, body_types=[7]*3, refresh=[2]*3, cdn_m=[1e6]*3,
 build=[38.88e6]*3,   # 9 чел × 6 мес × 720 тыс
 run=[17.28e6]*3,     # 4 чел × 6 мес × 720 тыс
 promo=[10e6]*3, legal=[2e6]*3, complaint_rate=[0.005]*3, complaint_cost=[150]*3,
)
def run(i,**ov):
    p={k:v[i] for k,v in P.items()};p.update(ov);m=lambda x:x*12
    T=p['orders_scope']*p['adoption']
    b1=p['buyout']+(1-p['buyout'])*p['size_share']*p['size_cut']
    new=T*p['conv_uplift']*(1-p['cannib']); newbuy=new*b1
    look=(T+new)*p['look_rate']; lookbuy=look*b1
    avoided=T*(b1-p['buyout'])
    r=dict(T=T,new=new,look=look,avoided=avoided)
    r['rev_conv']=m(newbuy*p['price']*p['take'])
    r['rev_look']=m(lookbuy*p['look_price']*p['take'])
    r['rev_ret']=m(avoided*p['price']*p['take'])
    r['rev']=r['rev_conv']+r['rev_look']+r['rev_ret']
    r['gmv']=m(newbuy*p['price']+lookbuy*p['look_price']+avoided*p['price'])
    r['var']=m((newbuy+lookbuy)*p['var_cost']+(new+look)*(1-b1)*p['ret_cost'])-m(avoided*p['ret_cost'])
    r['gross']=r['rev']-r['var']
    gens=(T+new)*p['gens_per_order']
    r['gen']=m(gens*(1-p['cache'])*p['gen_cost'])+p['sku']*p['body_types']*p['refresh']*p['gen_cost']+m(p['cdn_m'])
    r['team']=p['build']+p['run']
    r['other']=p['promo']+p['legal']+m(T*p['complaint_rate']*p['complaint_cost'])
    r['costs']=r['gen']+r['team']+r['other']
    r['profit']=r['gross']-r['costs']
    return r
if __name__=="__main__":
    for i,s in enumerate(S):
        r=run(i);print(s,{k:(round(v/1e6,1) if abs(v)>1e5 else round(v)) for k,v in r.items()})
    b=run(1)['profit'];print()
    for k,v in [('conv_uplift',0.05),('conv_uplift',0.20),('look_rate',0.0),('adoption',0.03),('gen_cost',6.0),('take',0.18),('size_cut',0.0)]:
        print(k,v,round((run(1,**{k:v})['profit']-b)/1e6,1))
    def thr(key,lo,hi,i=1):
        for _ in range(60):
            mid=(lo+hi)/2; lo,hi=(mid,hi) if run(i,**{key:mid})['profit']<0 else (lo,mid)
        return hi
    print('adoption be',thr('adoption',0.001,0.2)); print('uplift be',thr('conv_uplift',0,0.5))
    lo,hi=0,100
    for _ in range(60):
        mid=(lo+hi)/2; lo,hi=(mid,hi) if run(1,gen_cost=mid)['profit']>0 else (lo,mid)
    print('gen cost be',lo)
    print('only returns base',run(1,conv_uplift=0,look_rate=0)['profit']/1e6)
