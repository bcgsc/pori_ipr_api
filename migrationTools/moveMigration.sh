# rename some migration files to have the latest timestamps so they are applied after all current migrations

target=$1

if [ "$#" -ne "1" ]
then
    echo "$0 <target migration timestamp>"
    exit 2;
fi

cd migrations

last_stamp=$( ls -1 | sort | tail -n 1 | cut -f 1 -d '-' )
new_stamp=$(( last_stamp + 1 ));

echo "last stamp: $last_stamp, new stamp: $new_stamp"

for x in $( ls *${target}* );
do
    current=$( echo $x | cut -f 1 -d '-' );
    new=${x/$current/$new_stamp}
    echo "rename $x to $new"
    git mv $x $new
done

cd ..
